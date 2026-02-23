import { useState, useMemo } from 'react'
import { useList } from '@refinedev/core'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Input, Select, Space, message } from 'antd'
import type { SubjectListItem, ClassRoom, Teacher } from '@/types/api'

type DraftSubject = {
  id: string
  _isNew: true
  name: string
  classRoomId?: string
  teacherId?: string
  classRoom?: ClassRoom
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
  const { tableProps } = useTable<SubjectListItem>({
    resource: 'subjects',
    syncWithLocation: true,
  })

  const [newRows, setNewRows] = useState<DraftSubject[]>([])
  const [modified, setModified] = useState<
    Record<string, { name?: string; classRoomId?: string; teacherId?: string }>
  >({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editClassRoomId, setEditClassRoomId] = useState<string | undefined>()
  const [editTeacherId, setEditTeacherId] = useState<string | undefined>()

  const serverList = (tableProps.dataSource ?? []) as SubjectListItem[]

  const { data: teachersFromApi } = useList<Teacher>({
    resource: 'teachers',
  })

  const classRooms = useMemo(() => {
    const map = new Map<string, ClassRoom>()
    serverList.forEach((s) => {
      if (s.classRoom?.id) map.set(s.classRoom.id, s.classRoom)
    })
    return Array.from(map.values())
  }, [serverList])

  const teachers = useMemo(() => {
    const fromApi = teachersFromApi?.data ?? []
    if (fromApi.length > 0) return fromApi
    const map = new Map<string, Teacher>()
    serverList.forEach((s) => {
      if (s.teacher?.id) map.set(s.teacher.id, s.teacher)
    })
    return Array.from(map.values())
  }, [serverList, teachersFromApi?.data])

  const displayList: SubjectRow[] = [
    ...serverList.filter((r) => !deletedIds.has(r.id)),
    ...newRows,
  ]

  const hasChanges = newRows.length > 0 || Object.keys(modified).length > 0 || deletedIds.size > 0

  const getDisplayClassRoom = (row: SubjectRow) => {
    const mod = modified[row.id]
    if (mod?.classRoomId) return classRooms.find((c) => c.id === mod.classRoomId)?.name
    return row.classRoom?.name ?? (row as SubjectListItem).classRoom?.name
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
    setEditClassRoomId(undefined)
    setEditTeacherId(undefined)
  }

  const handleStartEdit = (row: SubjectRow) => {
    setEditingId(row.id)
    const mod = modified[row.id]
    setEditName(mod?.name ?? row.name ?? '')
    setEditClassRoomId(
      mod?.classRoomId ?? row.classRoom?.id ?? (row as SubjectListItem).classRoomId
    )
    setEditTeacherId(
      mod?.teacherId ?? row.teacher?.id ?? (row as SubjectListItem).teacherId
    )
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const isNew = newRows.some((r) => r.id === editingId)
    const classRoom = classRooms.find((c) => c.id === editClassRoomId)
    const teacher = teachers.find((t) => t.id === editTeacherId)
    if (isNew) {
      setNewRows((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: editName,
                classRoomId: editClassRoomId,
                teacherId: editTeacherId,
                classRoom,
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
          classRoomId: editClassRoomId,
          teacherId: editTeacherId,
        },
      }))
    }
    setEditingId(null)
    setEditName('')
    setEditClassRoomId(undefined)
    setEditTeacherId(undefined)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditClassRoomId(undefined)
    setEditTeacherId(undefined)
  }

  const handleDeleteRow = (row: SubjectRow) => {
    if (isDraft(row)) {
      setNewRows((prev) => prev.filter((r) => r.id !== row.id))
    } else {
      setDeletedIds((prev) => new Set(prev).add(row.id))
    }
  }

  const handleSave = () => {
    message.info(
      'В текущей версии API создание и изменение предметов не предусмотрено. Предметы и классы заданы в системе.'
    )
  }

  const isEditing = (row: SubjectRow) => editingId === row.id

  return (
    <List
      title="Предметы"
      headerButtons={
        <>
          <Button type="primary" onClick={handleAdd}>
            Добавить
          </Button>
          {hasChanges && (
            <Button type="primary" onClick={handleSave}>
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
            title: 'Группа',
            key: 'classRoom',
            render: (_, row) =>
              isEditing(row) ? (
                <Select
                  value={editClassRoomId}
                  onChange={setEditClassRoomId}
                  placeholder="Группа"
                  allowClear
                  style={{ width: 120 }}
                  options={classRooms.map((c) => ({ value: c.id, label: c.name }))}
                />
              ) : (
                getDisplayClassRoom(row) ?? '—'
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
    </List>
  )
}
