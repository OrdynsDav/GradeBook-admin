import { useState, useMemo } from 'react'
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Input, Select, Space, Modal, Form, message, InputNumber, Popconfirm } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import { createSubjectGrade, deleteGrade, getSubjectGrades } from '@/lib/api'
import type { SubjectListItem, Group, Teacher, User, GradeItem } from '@/types/api'

type DraftSubject = {
  id: string
  _isNew: true
  name: string
  groupIds?: string[]
  groupId?: string
  teacherId?: string
  group?: Group
  groups?: Group[]
  teacher?: Teacher
}

type SubjectRow = SubjectListItem | DraftSubject

function isDraft(r: SubjectRow): r is DraftSubject {
  return (r as DraftSubject)._isNew === true
}

function teacherLabel(t: Teacher) {
  return [t.lastName, t.firstName, t.middleName].filter(Boolean).join(' ')
}

export function SubjectsPage() {
  const { tableProps, tableQueryResult } = useTable<SubjectListItem>({
    resource: 'subjects',
    syncWithLocation: true,
  })
  const createMutation = useCreate()
  const updateMutation = useUpdate()
  const deleteMutation = useDelete()

  const [newRows, setNewRows] = useState<DraftSubject[]>([])
  const [modified, setModified] = useState<
    Record<string, { name?: string; groupIds?: string[]; groupId?: string; teacherId?: string }>
  >({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editGroupIds, setEditGroupIds] = useState<string[]>([])
  const [editTeacherId, setEditTeacherId] = useState<string | undefined>()

  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterName, setFilterName] = useState<string | null>(null)
  const [filterTeacherId, setFilterTeacherId] = useState<string | null>(null)
  const [gradeModalOpen, setGradeModalOpen] = useState(false)
  const [gradeSubject, setGradeSubject] = useState<SubjectListItem | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historySubject, setHistorySubject] = useState<SubjectListItem | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyGrades, setHistoryGrades] = useState<GradeItem[]>([])
  const [sessionGradesBySubject, setSessionGradesBySubject] = useState<Record<string, GradeItem[]>>({})
  const [gradeSubmitting, setGradeSubmitting] = useState(false)
  const [gradeForm] = Form.useForm<{
    groupId?: string
    studentIds: string[]
    value: number
    comment?: string
    gradedAt?: string
  }>()

  const serverList = (tableProps.dataSource ?? []) as SubjectListItem[]

  const { data: teachersFromApi } = useList<Teacher>({
    resource: 'teachers',
  })
  const { data: usersFromApi } = useList<User>({
    resource: 'users',
  })
  const { data: groupsFromApi } = useList<Group>({ resource: 'groups' })
  const groups = (groupsFromApi?.data ?? []) as Group[]

  const teachers = useMemo(() => {
    const fromApi = teachersFromApi?.data ?? []
    if (fromApi.length > 0) return fromApi
    const map = new Map<string, Teacher>()
    serverList.forEach((s) => {
      if (s.teacher?.id) map.set(s.teacher.id, s.teacher)
    })
    return Array.from(map.values())
  }, [serverList, teachersFromApi?.data])

  const subjectNameOptions = useMemo(() => {
    const names = new Set<string>()
    serverList.forEach((s) => s.name?.trim() && names.add(s.name.trim()))
    newRows.forEach((r) => r.name?.trim() && names.add(r.name.trim()))
    return Array.from(names).sort()
  }, [serverList, newRows])

  const students = useMemo(() => {
    return ((usersFromApi?.data ?? []) as User[]).filter((u) => u.role === 'student')
  }, [usersFromApi?.data])

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) {
      map.set(s.id, [s.lastName, s.firstName, s.middleName].filter(Boolean).join(' '))
    }
    return map
  }, [students])

  const serverListDeduped = useMemo(() => {
    const filtered = serverList.filter((r) => !deletedIds.has(r.id))
    const seen = new Set<string>()
    return filtered.filter((row) => {
      const name = (row.name ?? '').trim()
      const teacherId = row.teacherId ?? row.teacher?.id ?? ''
      const key = `${name}|${teacherId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [serverList, deletedIds])

  const baseDisplayList: SubjectRow[] = [...serverListDeduped, ...newRows]

  const displayList = useMemo(() => {
    let list = baseDisplayList
    if (filterName != null && filterName !== '') {
      list = list.filter((row) => (modified[row.id]?.name ?? (row as SubjectListItem).name ?? (row as DraftSubject).name ?? '').trim() === filterName)
    }
    if (filterTeacherId != null && filterTeacherId !== '') {
      list = list.filter((row) => {
        const tid = modified[row.id]?.teacherId ?? (row as SubjectListItem).teacherId ?? (row as SubjectListItem).teacher?.id ?? (row as DraftSubject).teacherId ?? (row as DraftSubject).teacher?.id
        return tid === filterTeacherId
      })
    }
    return list
  }, [baseDisplayList, filterName, filterTeacherId, modified])

  const hasActiveFilters = filterName != null || (filterTeacherId != null && filterTeacherId !== '')

  const hasChanges = newRows.length > 0 || Object.keys(modified).length > 0 || deletedIds.size > 0

  const getDisplayTeacher = (row: SubjectRow) => {
    const mod = modified[row.id]
    if (mod?.teacherId) {
      const t = teachers.find((t) => t.id === mod.teacherId)
      return t ? teacherLabel(t) : undefined
    }
    const t = row.teacher ?? (row as SubjectListItem).teacher
    return t ? teacherLabel(t) : undefined
  }

  const handleAdd = () => {
    const draft: DraftSubject = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      _isNew: true,
      name: '',
    }
    setNewRows((prev) => [...prev, draft])
    setEditingId(draft.id)
    setEditName('')
    setEditGroupIds(groups.length > 0 ? [groups[0].id] : [])
    setEditTeacherId(undefined)
  }

  const handleStartEdit = (row: SubjectRow) => {
    setEditingId(row.id)
    const mod = modified[row.id]
    setEditName(mod?.name ?? row.name ?? '')
    const draft = row as DraftSubject
    const currentGroupId = (row as SubjectListItem).groupId ?? draft.groupId ?? draft.group?.id ?? (draft.groupIds?.[0])
    setEditGroupIds(currentGroupId ? [currentGroupId] : groups.length > 0 ? [groups[0].id] : [])
    setEditTeacherId(
      mod?.teacherId ?? row.teacher?.id ?? (row as SubjectListItem).teacherId
    )
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const isNew = newRows.some((r) => r.id === editingId)
    const selectedGroups = groups.filter((g) => editGroupIds.includes(g.id))
    const teacher = teachers.find((t) => t.id === editTeacherId)
    if (isNew) {
      setNewRows((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
              ...r,
              name: editName,
              groupIds: editGroupIds,
              teacherId: editTeacherId,
              groups: selectedGroups,
              teacher,
            }
            : r
        )
      )
    } else {
      setModified((prev) => ({
        ...prev,
        [editingId]: {
          name: editName,
          groupIds: editGroupIds,
          teacherId: editTeacherId,
        },
      }))
    }
    setEditingId(null)
    setEditName('')
    setEditGroupIds([])
    setEditTeacherId(undefined)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditGroupIds([])
    setEditTeacherId(undefined)
  }

  const handleDeleteRow = (row: SubjectRow) => {
    if (isDraft(row)) {
      setNewRows((prev) => prev.filter((r) => r.id !== row.id))
    } else {
      setDeletedIds((prev) => new Set(prev).add(row.id))
    }
  }

  const runMutation = (
    fn: (opts: { onSuccess: () => void; onError: (e: unknown) => void }) => void
  ) =>
    new Promise<void>((resolve, reject) => {
      fn({
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      })
    })

  const handleSave = async () => {
    try {
      for (const id of deletedIds) {
        await runMutation(({ onSuccess, onError }) =>
          deleteMutation.mutate(
            { resource: 'subjects', id },
            { onSuccess: () => onSuccess(), onError }
          )
        )
      }
      for (const [id, mod] of Object.entries(modified)) {
        const groupIds = mod.groupIds ?? (mod.groupId ? [mod.groupId] : [])
        const name = mod.name?.trim()
        const teacherId = mod.teacherId
        if (!name || !teacherId || groupIds.length === 0) continue
        if (groupIds.length === 1) {
          await runMutation(({ onSuccess, onError }) =>
            updateMutation.mutate(
              { resource: 'subjects', id, values: { name, groupId: groupIds[0], teacherId } },
              { onSuccess: () => onSuccess(), onError }
            )
          )
        } else {
          await runMutation(({ onSuccess, onError }) =>
            deleteMutation.mutate(
              { resource: 'subjects', id },
              { onSuccess: () => onSuccess(), onError }
            )
          )
          for (const groupId of groupIds) {
            await runMutation(({ onSuccess, onError }) =>
              createMutation.mutate(
                { resource: 'subjects', values: { name, groupId, teacherId } },
                { onSuccess: () => onSuccess(), onError }
              )
            )
          }
        }
      }
      for (const row of newRows) {
        const name = row.name?.trim()
        const teacherId = row.teacherId
        const groupIds = row.groupIds ?? (row.groupId ? [row.groupId] : [])
        if (!name || !teacherId || groupIds.length === 0) continue
        for (const groupId of groupIds) {
          await runMutation(({ onSuccess, onError }) =>
            createMutation.mutate(
              { resource: 'subjects', values: { name, groupId, teacherId } },
              { onSuccess: () => onSuccess(), onError }
            )
          )
        }
      }
      setNewRows([])
      setModified({})
      setDeletedIds(new Set())
      tableQueryResult?.refetch()
      message.success('Изменения сохранены')
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? 'Ошибка при сохранении'
      message.error(msg)
    }
  }

  const studentsByGroup = useMemo(() => {
    const map = new Map<string, User[]>()
    for (const s of students) {
      const gid = s.groupId ?? s.group?.id
      if (!gid) continue
      const list = map.get(gid) ?? []
      list.push(s)
      map.set(gid, list)
    }
    return map
  }, [students])

  const selectedGradeGroupId = Form.useWatch('groupId', gradeForm)

  const studentsForSelectedGroup = useMemo(() => {
    if (!selectedGradeGroupId) return []
    return studentsByGroup.get(selectedGradeGroupId) ?? []
  }, [selectedGradeGroupId, studentsByGroup])

  const gradeGroupOptions = useMemo(() => {
    return groups
      .filter((g) => studentsByGroup.has(g.id))
      .map((g) => ({
        value: g.id,
        label: g.name ?? g.groupName ?? 'Без названия',
      }))
  }, [groups, studentsByGroup])

  const getGradeStudentName = (grade: GradeItem) => {
    if (grade.student) {
      return [grade.student.lastName, grade.student.firstName, grade.student.middleName]
        .filter(Boolean)
        .join(' ')
    }
    return studentNameById.get(grade.studentId) ?? grade.studentId
  }

  const loadHistoryGrades = async (subjectId: string) => {
    setHistoryLoading(true)
    try {
      const list = await getSubjectGrades(subjectId)
      setHistoryGrades(list)
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? 'Не удалось загрузить оценки'
      message.error(msg)
      setHistoryGrades([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleOpenGrades = async (row: SubjectRow) => {
    if (isDraft(row)) {
      message.info('Сначала сохраните новый предмет, затем можно выставлять оценки')
      return
    }
    const subject = row as SubjectListItem
    setGradeSubject(subject)
    setGradeModalOpen(true)
    gradeForm.resetFields()
    gradeForm.setFieldsValue({
      groupId: subject.groupId,
      value: 5,
      studentIds: [],
      gradedAt: new Date().toISOString().slice(0, 16),
    })
  }

  const handleCloseGrades = () => {
    setGradeModalOpen(false)
    setGradeSubject(null)
    gradeForm.resetFields()
  }

  const handleOpenHistory = async (row: SubjectRow) => {
    if (isDraft(row)) {
      message.info('Сначала сохраните новый предмет')
      return
    }
    const subject = row as SubjectListItem
    setHistorySubject(subject)
    setHistoryModalOpen(true)
    await loadHistoryGrades(subject.id)
  }

  const handleCloseHistory = () => {
    setHistoryModalOpen(false)
    setHistorySubject(null)
    setHistoryGrades([])
  }

  const handleCreateGrade = async () => {
    if (!gradeSubject) return
    try {
      const values = await gradeForm.validateFields()
      setGradeSubmitting(true)
      const studentIds = values.studentIds ?? []
      if (studentIds.length === 0) {
        message.warning('Выберите хотя бы одного ученика')
        return
      }

      let successCount = 0
      const createdGrades: GradeItem[] = []
      for (const studentId of studentIds) {
        try {
          const created = await createSubjectGrade(gradeSubject.id, {
            studentId,
            value: Number(values.value),
            comment: values.comment?.trim() || undefined,
            gradedAt: values.gradedAt ? new Date(values.gradedAt).toISOString() : undefined,
          })
          successCount += 1
          createdGrades.push(created)
        } catch {
          // продолжаем, чтобы попытаться выставить остальным выбранным ученикам
        }
      }

      if (successCount === 0) {
        message.error('Не удалось поставить оценки выбранным ученикам')
        return
      }
      if (successCount < studentIds.length) {
        message.warning(`Оценки выставлены частично: ${successCount} из ${studentIds.length}`)
      } else {
        message.success(`Оценки выставлены: ${successCount}`)
      }
      if (createdGrades.length > 0) {
        setSessionGradesBySubject((prev) => ({
          ...prev,
          [gradeSubject.id]: [...createdGrades, ...(prev[gradeSubject.id] ?? [])],
        }))
      }
      gradeForm.setFieldsValue({
        studentIds: [],
        value: 5,
        comment: undefined,
        gradedAt: new Date().toISOString().slice(0, 16),
      })
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? 'Не удалось добавить оценку'
      message.error(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setGradeSubmitting(false)
    }
  }

  const handleDeleteGrade = async (gradeId: string) => {
    if (!historySubject) return
    try {
      await deleteGrade(gradeId)
      message.success('Оценка удалена')
      await loadHistoryGrades(historySubject.id)
      setSessionGradesBySubject((prev) => {
        const current = prev[historySubject.id] ?? []
        return {
          ...prev,
          [historySubject.id]: current.filter((g) => g.id !== gradeId),
        }
      })
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? 'Не удалось удалить оценку'
      message.error(msg)
    }
  }

  const isEditing = (row: SubjectRow) => editingId === row.id

  return (
    <List
      title="Предметы"
      headerButtons={
        <>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterModalOpen(true)}
            type={hasActiveFilters ? 'primary' : 'default'}
          >
            Фильтры
            {hasActiveFilters && ' (вкл.)'}
          </Button>
          <Button type="primary" onClick={handleAdd}>
            Добавить
          </Button>
          {hasChanges && (
            <Button
              type="primary"
              onClick={handleSave}
              loading={
                createMutation.isLoading ||
                updateMutation.isLoading ||
                deleteMutation.isLoading
              }
            >
              Сохранить
            </Button>
          )}
        </>
      }
    >
      <Table<SubjectRow>
        rowKey="id"
        dataSource={displayList}
        pagination={false}
        columns={[
          {
            title: 'Название',
            dataIndex: 'name',
            key: 'name',
            render: (val, row) =>
              isEditing(row) ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onPressEnter={handleSaveEdit}
                  placeholder="Название"
                  style={{ width: 200 }}
                />
              ) : (
                <span style={isDraft(row) ? { fontStyle: 'italic' } : undefined}>
                  {modified[row.id]?.name ?? val ?? '—'}
                </span>
              ),
          },
          {
            title: 'Учитель',
            key: 'teacher',
            render: (_, row) =>
              isEditing(row) ? (
                <Select
                  value={editTeacherId}
                  onChange={setEditTeacherId}
                  placeholder="Учитель"
                  allowClear
                  style={{ minWidth: 200 }}
                  showSearch
                  optionFilterProp="label"
                  options={teachers.map((t) => ({
                    value: t.id,
                    label: teacherLabel(t),
                  }))}
                />
              ) : (
                getDisplayTeacher(row) ?? '—'
              ),
          },
          {
            title: '',
            key: 'actions',
            render: (_, record) => (
              <Space>
                {isEditing(record) ? (
                  <>
                    <Button size="small" type="primary" onClick={handleSaveEdit}>
                      Готово
                    </Button>
                    <Button size="small" onClick={handleCancelEdit}>
                      Отмена
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="small" onClick={() => handleStartEdit(record)}>
                      Изменить
                    </Button>
                    <Button size="small" type="primary" onClick={() => handleOpenGrades(record)}>
                      Оценки
                    </Button>
                    <Button size="small" onClick={() => handleOpenHistory(record)}>
                      История
                    </Button>
                    <Button size="small" danger onClick={() => handleDeleteRow(record)}>
                      Удалить
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Фильтры"
        open={filterModalOpen}
        onCancel={() => setFilterModalOpen(false)}
        footer={[
          <Button key="reset" onClick={() => { setFilterName(null); setFilterTeacherId(null); setFilterModalOpen(false); }}>
            Сбросить
          </Button>,
          <Button key="apply" type="primary" onClick={() => setFilterModalOpen(false)}>
            Применить
          </Button>,
        ]}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Название предмета">
            <Select
              placeholder="Все предметы"
              allowClear
              value={filterName ?? undefined}
              onChange={(v) => setFilterName(v ?? null)}
              options={subjectNameOptions.map((n) => ({ value: n, label: n }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="По учителю">
            <Select
              placeholder="Все учителя"
              allowClear
              value={filterTeacherId ?? undefined}
              onChange={(v) => setFilterTeacherId(v ?? null)}
              options={teachers.map((t) => ({ value: t.id, label: teacherLabel(t) }))}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          gradeSubject
            ? `Оценки: ${gradeSubject.name} (${teacherLabel(gradeSubject.teacher)})`
            : 'Оценки'
        }
        open={gradeModalOpen}
        onCancel={handleCloseGrades}
        footer={null}
        width={900}
        destroyOnClose
      >
        {gradeSubject && (
          <>
            <Form
              form={gradeForm}
              layout="vertical"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.02)',
              }}
            >
              <Space align="start" wrap style={{ width: '100%' }}>
                <Form.Item
                  name="groupId"
                  label="Группа"
                  rules={[{ required: true, message: 'Выберите группу' }]}
                  style={{ minWidth: 220, marginBottom: 8 }}
                >
                  <Select
                    placeholder="Выберите группу"
                    showSearch
                    optionFilterProp="label"
                    onChange={() => gradeForm.setFieldValue('studentIds', [])}
                    options={gradeGroupOptions}
                  />
                </Form.Item>
                <Form.Item
                  name="studentIds"
                  label="Ученики"
                  rules={[{ required: true, message: 'Выберите хотя бы одного ученика' }]}
                  style={{ minWidth: 280, marginBottom: 8 }}
                >
                  <Select
                    mode="multiple"
                    placeholder="Выберите учеников"
                    showSearch
                    optionFilterProp="label"
                    options={studentsForSelectedGroup.map((s) => ({
                      value: s.id,
                      label: [s.lastName, s.firstName, s.middleName].filter(Boolean).join(' '),
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="value"
                  label="Оценка"
                  rules={[
                    { required: true, message: 'Укажите оценку' },
                    { type: 'number', min: 2, max: 5, message: 'Оценка должна быть от 2 до 5' },
                  ]}
                  style={{ width: 120, marginBottom: 8 }}
                >
                  <InputNumber min={2} max={5} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="gradedAt"
                  label="Дата и время"
                  style={{ minWidth: 220, marginBottom: 8 }}
                >
                  <Input type="datetime-local" />
                </Form.Item>
              </Space>
              <Form.Item name="comment" label="Комментарий" style={{ marginBottom: 8 }}>
                <Input.TextArea rows={2} maxLength={500} placeholder="Комментарий к оценке" />
              </Form.Item>
              <Space>
                <Button type="primary" onClick={handleCreateGrade} loading={gradeSubmitting}>
                  Поставить оценку
                </Button>
                <Button onClick={() => gradeForm.resetFields()}>Очистить форму</Button>
              </Space>
            </Form>

            <Table<GradeItem>
              rowKey="id"
              dataSource={gradeSubject ? sessionGradesBySubject[gradeSubject.id] ?? [] : []}
              pagination={{ pageSize: 8 }}
              style={{ marginTop: 12 }}
              columns={[
                {
                  title: 'Ученик',
                  key: 'student',
                  render: (_, g) => getGradeStudentName(g),
                },
                { title: 'Оценка', dataIndex: 'value', key: 'value', width: 90 },
                {
                  title: 'Комментарий',
                  dataIndex: 'comment',
                  key: 'comment',
                  render: (val) => val || '—',
                },
                {
                  title: 'Дата',
                  dataIndex: 'gradedAt',
                  key: 'gradedAt',
                  width: 180,
                  render: (val: string) => (val ? new Date(val).toLocaleString('ru-RU') : '—'),
                },
              ]}
            />
          </>
        )}
      </Modal>

      <Modal
        title={
          historySubject
            ? `История оценок: ${historySubject.name} (${teacherLabel(historySubject.teacher)})`
            : 'История оценок'
        }
        open={historyModalOpen}
        onCancel={handleCloseHistory}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Table<GradeItem>
          rowKey="id"
          loading={historyLoading}
          dataSource={historyGrades}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'Ученик',
              key: 'student',
              render: (_, g) => getGradeStudentName(g),
            },
            { title: 'Оценка', dataIndex: 'value', key: 'value', width: 90 },
            {
              title: 'Комментарий',
              dataIndex: 'comment',
              key: 'comment',
              render: (val) => val || '—',
            },
            {
              title: 'Дата',
              dataIndex: 'gradedAt',
              key: 'gradedAt',
              width: 180,
              render: (val: string) => (val ? new Date(val).toLocaleString('ru-RU') : '—'),
            },
            {
              title: '',
              key: 'actions',
              width: 110,
              render: (_, g) => (
                <Popconfirm
                  title="Удалить оценку?"
                  onConfirm={() => handleDeleteGrade(g.id)}
                >
                  <Button size="small" danger>
                    Удалить
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>
    </List>
  )
}
