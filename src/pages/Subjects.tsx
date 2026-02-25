import { useState, useMemo } from 'react'
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Input, Select, Space, Modal, Form, message } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import { GroupIdsDropdown } from '@/components/GroupIdsDropdown'
import type { SubjectListItem, Group, Teacher } from '@/types/api'

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
  const [filterCourse, setFilterCourse] = useState<number | null>(null)
  const [filterTeacherId, setFilterTeacherId] = useState<string | null>(null)

  const serverList = (tableProps.dataSource ?? []) as SubjectListItem[]

  const { data: teachersFromApi } = useList<Teacher>({
    resource: 'teachers',
  })
  const { data: groupsFromApi } = useList<Group>({ resource: 'groups' })

  const groups = useMemo(() => {
    const fromApi = groupsFromApi?.data ?? []
    if (fromApi.length > 0) return fromApi
    const map = new Map<string, Group>()
    serverList.forEach((s) => {
      if (s.group?.id) map.set(s.group.id, s.group)
    })
    return Array.from(map.values())
  }, [serverList, groupsFromApi?.data])

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

  const courseOptions = [1, 2, 3, 4]

  const baseDisplayList: SubjectRow[] = [
    ...serverList.filter((r) => !deletedIds.has(r.id)),
    ...newRows,
  ]

  const displayList = useMemo(() => {
    let list = baseDisplayList
    if (filterName != null && filterName !== '') {
      list = list.filter((row) => (modified[row.id]?.name ?? (row as SubjectListItem).name ?? (row as DraftSubject).name ?? '').trim() === filterName)
    }
    if (filterCourse != null) {
      list = list.filter((row) => {
        const mod = modified[row.id]
        let course: number | undefined
        if (mod?.groupIds?.length) course = groups.find((g) => g.id === mod.groupIds![0])?.course
        else if (mod?.groupId) course = groups.find((g) => g.id === mod.groupId)?.course
        else if ((row as SubjectListItem).group?.course != null) course = (row as SubjectListItem).group!.course
        else if ((row as SubjectListItem).group?.id) course = groups.find((g) => g.id === (row as SubjectListItem).group!.id)?.course
        else if ((row as DraftSubject).groupIds?.length) course = groups.find((g) => g.id === (row as DraftSubject).groupIds![0])?.course
        else if ((row as DraftSubject).group?.course != null) course = (row as DraftSubject).group!.course
        else if ((row as DraftSubject).group?.id) course = groups.find((g) => g.id === (row as DraftSubject).group!.id)?.course
        return course === filterCourse
      })
    }
    if (filterTeacherId != null && filterTeacherId !== '') {
      list = list.filter((row) => {
        const tid = modified[row.id]?.teacherId ?? (row as SubjectListItem).teacherId ?? (row as SubjectListItem).teacher?.id ?? (row as DraftSubject).teacherId ?? (row as DraftSubject).teacher?.id
        return tid === filterTeacherId
      })
    }
    return list
  }, [baseDisplayList, filterName, filterCourse, filterTeacherId, modified, groups])

  const hasActiveFilters = filterName != null || filterCourse != null || (filterTeacherId != null && filterTeacherId !== '')

  const hasChanges = newRows.length > 0 || Object.keys(modified).length > 0 || deletedIds.size > 0

  const getDisplayGroup = (row: SubjectRow) => {
    const mod = modified[row.id]
    if (mod?.groupIds?.length) {
      return mod.groupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(', ')
    }
    if (mod?.groupId) return groups.find((g) => g.id === mod.groupId)?.name
    const draft = row as DraftSubject
    if (draft.groupIds?.length) {
      return draft.groupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(', ')
    }
    if (draft.groups?.length) return draft.groups.map((g) => g.name).join(', ')
    return row.group?.name ?? (row as SubjectListItem).group?.name
  }

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
    setEditGroupIds([])
    setEditTeacherId(undefined)
  }

  const handleStartEdit = (row: SubjectRow) => {
    setEditingId(row.id)
    const mod = modified[row.id]
    setEditName(mod?.name ?? row.name ?? '')
    const draft = row as DraftSubject
    setEditGroupIds(
      mod?.groupIds ??
        (mod?.groupId ? [mod.groupId] : null) ??
        draft.groupIds ??
        (draft.group?.id ? [draft.group.id] : (row as SubjectListItem).groupId ? [(row as SubjectListItem).groupId] : [])
    )
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
            title: 'Группы',
            key: 'group',
            render: (_, row) =>
              isEditing(row) ? (
                <GroupIdsDropdown
                  groups={groups}
                  value={editGroupIds}
                  onChange={setEditGroupIds}
                  placeholder="Группы (несколько)"
                  style={{ minWidth: 200 }}
                />
              ) : (
                getDisplayGroup(row) ?? '—'
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
          <Button key="reset" onClick={() => { setFilterName(null); setFilterCourse(null); setFilterTeacherId(null); setFilterModalOpen(false); }}>
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
          <Form.Item label="По курсу">
            <Select
              placeholder="Все курсы"
              allowClear
              value={filterCourse ?? undefined}
              onChange={(v) => setFilterCourse(v ?? null)}
              options={courseOptions.map((c) => ({ value: c, label: `${c} курс` }))}
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
    </List>
  )
}
