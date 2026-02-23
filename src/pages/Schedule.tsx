import { useState, useMemo } from 'react'
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, DatePicker, Space, Modal, Form, Select, Input, message } from 'antd'
import dayjs from 'dayjs'
import type { LessonItem, SubjectListItem, CreateLessonRequest } from '@/types/api'

type DraftLesson = {
  id: string
  _isNew: true
  subjectId: string
  startsAt: string
  endsAt: string
  room?: string
  subject?: { id: string; name: string }
  classRoom?: { name: string }
  teacher?: { firstName: string; lastName: string }
}

type LessonRow = LessonItem | DraftLesson

function isDraft(r: LessonRow): r is DraftLesson {
  return (r as DraftLesson)._isNew === true
}

export function SchedulePage() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<LessonRow | null>(null)
  const [form] = Form.useForm()

  const [newRows, setNewRows] = useState<DraftLesson[]>([])
  const [modified, setModified] = useState<Record<string, Partial<CreateLessonRequest>>>({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const { data: subjectsData } = useList<SubjectListItem>({
    resource: 'subjects',
  })
  const subjects = subjectsData?.data ?? []

  const { tableProps, tableQueryResult } = useTable<LessonItem>({
    resource: 'schedule',
    syncWithLocation: false,
    filters: {
      permanent: [{ field: 'date', operator: 'eq', value: date }],
    },
    meta: { date },
  })

  const mutateCreate = useCreate()
  const mutateUpdate = useUpdate()
  const mutateDelete = useDelete()

  const serverList = (tableProps.dataSource ?? []) as LessonItem[]
  const displayList: LessonRow[] = useMemo(() => {
    const fromServer = serverList.filter((r) => !deletedIds.has(r.id))
    return [...fromServer, ...newRows]
  }, [serverList, deletedIds, newRows])

  const hasChanges = newRows.length > 0 || Object.keys(modified).length > 0 || deletedIds.size > 0

  const handleAddDraft = () => {
    form.resetFields()
    setEditingRow(null)
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = () => {
    form.validateFields().then((values) => {
      const draft: DraftLesson = {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        _isNew: true,
        subjectId: values.subjectId,
        startsAt: dayjs(values.startsAt).toISOString(),
        endsAt: dayjs(values.endsAt).toISOString(),
        room: values.room,
        subject: subjects.find((s) => s.id === values.subjectId)
          ? { id: values.subjectId, name: subjects.find((s) => s.id === values.subjectId)!.name }
          : undefined,
        classRoom: subjects.find((s) => s.id === values.subjectId)?.classRoom
          ? { name: subjects.find((s) => s.id === values.subjectId)!.classRoom!.name }
          : undefined,
        teacher: (() => {
          const s = subjects.find((s) => s.id === values.subjectId)?.teacher
          return s ? { firstName: s.firstName, lastName: s.lastName } : undefined
        })(),
      }
      setNewRows((prev) => [...prev, draft])
      setCreateModalOpen(false)
      form.resetFields()
    })
  }

  const openEdit = (row: LessonRow) => {
    setEditingRow(row)
    setCreateModalOpen(false)
    form.setFieldsValue({
      subjectId: row.subject?.id ?? (row as LessonItem).subject?.id,
      startsAt: row.startsAt ? dayjs(row.startsAt) : null,
      endsAt: row.endsAt ? dayjs(row.endsAt) : null,
      room: row.room,
    })
  }

  const handleEditSubmit = () => {
    if (!editingRow) return
    form.validateFields().then((values) => {
      const payload = {
        subjectId: values.subjectId,
        startsAt: dayjs(values.startsAt).toISOString(),
        endsAt: dayjs(values.endsAt).toISOString(),
        room: values.room,
      }
      if (isDraft(editingRow)) {
        setNewRows((prev) =>
          prev.map((r) =>
            r.id === editingRow.id
              ? {
                  ...r,
                  ...payload,
                  subject: subjects.find((s) => s.id === values.subjectId)
                    ? { id: values.subjectId, name: subjects.find((s) => s.id === values.subjectId)!.name }
                    : r.subject,
                  classRoom: subjects.find((s) => s.id === values.subjectId)?.classRoom
                    ? { name: subjects.find((s) => s.id === values.subjectId)!.classRoom!.name }
                    : r.classRoom,
                  teacher: (() => {
                    const s = subjects.find((s) => s.id === values.subjectId)?.teacher
                    return s ? { firstName: s.firstName, lastName: s.lastName } : undefined
                  })(),
                }
              : r
          )
        )
      } else {
        setModified((prev) => ({ ...prev, [editingRow.id]: payload }))
      }
      setEditingRow(null)
      form.resetFields()
    })
  }

  const handleDeleteRow = (row: LessonRow) => {
    if (isDraft(row)) {
      setNewRows((prev) => prev.filter((r) => r.id !== row.id))
    } else {
      setDeletedIds((prev) => new Set(prev).add(row.id))
    }
  }

  const handleSave = () => {
    const promises: Promise<unknown>[] = []
    deletedIds.forEach((id) => {
      promises.push(
        new Promise((resolve, reject) => {
          mutateDelete.mutate(
            { resource: 'schedule', id },
            {
              onSuccess: () => resolve(undefined),
              onError: (e: unknown) => reject(e),
            }
          )
        })
      )
    })
    Object.entries(modified).forEach(([id, vars]) => {
      promises.push(
        new Promise((resolve, reject) => {
          mutateUpdate.mutate(
            { resource: 'schedule', id, values: vars },
            {
              onSuccess: () => resolve(undefined),
              onError: (e: unknown) => reject(e),
            }
          )
        })
      )
    })
    newRows.forEach((row) => {
      promises.push(
        new Promise((resolve, reject) => {
          mutateCreate.mutate(
            {
              resource: 'schedule',
              values: {
                subjectId: row.subjectId,
                startsAt: row.startsAt,
                endsAt: row.endsAt,
                room: row.room,
              },
            },
            {
              onSuccess: () => resolve(undefined),
              onError: (e: unknown) => reject(e),
            }
          )
        })
      )
    })
    Promise.all(promises)
      .then(() => {
        setNewRows([])
        setModified({})
        setDeletedIds(new Set())
        tableQueryResult?.refetch()
        message.success('Изменения сохранены')
      })
      .catch(() => {
        message.error('Ошибка при сохранении')
      })
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
    form.resetFields()
  }

  return (
    <List
      title="Расписание"
      headerButtons={
        <>
          <DatePicker
            value={dayjs(date)}
            onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
            allowClear={false}
          />
          <Button type="primary" onClick={handleAddDraft}>
            Добавить урок
          </Button>
          {hasChanges && (
            <Button type="primary" onClick={handleSave}>
              Сохранить
            </Button>
          )}
        </>
      }
    >
      <Table
        rowKey="id"
        dataSource={displayList}
        pagination={false}
        columns={[
          {
            title: 'Время',
            key: 'time',
            render: (_, r: LessonRow) =>
              `${dayjs(r.startsAt).format('HH:mm')} – ${dayjs(r.endsAt).format('HH:mm')}`,
          },
          {
            title: 'Предмет',
            key: 'subject',
            render: (_, r: LessonRow) => r.subject?.name ?? '—',
          },
          {
            title: 'Группа',
            key: 'classRoom',
            render: (_, r: LessonRow) => r.classRoom?.name ?? '—',
          },
          {
            title: 'Учитель',
            key: 'teacher',
            render: (_, r: LessonRow) =>
              r.teacher ? [r.teacher.lastName, r.teacher.firstName].filter(Boolean).join(' ') : '—',
          },
          { title: 'Аудитория', dataIndex: 'room', key: 'room', render: (v: string) => v ?? '—' },
          {
            title: '',
            key: 'actions',
            render: (_, record: LessonRow) => (
              <Space>
                <Button size="small" onClick={() => openEdit(record)}>
                  Изменить
                </Button>
                <Button size="small" danger onClick={() => handleDeleteRow(record)}>
                  Удалить
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Новый урок"
        open={createModalOpen && !editingRow}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalOpen(false)}
        destroyOnClose
        okText="Добавить"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
            <Select
              options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.classRoom?.name})` }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="startsAt" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endsAt" label="Конец" rules={[{ required: true }]}>
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="room" label="Аудитория">
            <Input maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Изменить урок"
        open={!!editingRow}
        onOk={handleEditSubmit}
        onCancel={handleCancelEdit}
        destroyOnClose
        okText="Сохранить"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
            <Select
              options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.classRoom?.name})` }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="startsAt" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endsAt" label="Конец" rules={[{ required: true }]}>
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="room" label="Аудитория">
            <Input maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  )
}
