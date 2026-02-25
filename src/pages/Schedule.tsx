import { useState, useMemo, useRef, useCallback } from 'react'
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, DatePicker, Space, Modal, Form, Select, Input, TimePicker, message, Tooltip } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { LessonItem, SubjectListItem, CreateLessonRequest } from '@/types/api'
import { importScheduleFromExcel } from '@/lib/api'
import './ScheduleTimePicker.css'

type DraftLesson = {
  id: string
  _isNew: true
  subjectId: string
  startsAt: string
  endsAt: string
  room?: string
  subject?: { id: string; name: string }
  group?: { id: string; name: string; course?: number; groupName?: string }
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
  const [importLoading, setImportLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: subjectsData } = useList<SubjectListItem>({
    resource: 'subjects',
  })
  const subjects = subjectsData?.data ?? []

  const scheduleFilters = useMemo(
    () => ({ permanent: [{ field: 'date', operator: 'eq' as const, value: date }] }),
    [date]
  )
  const scheduleMeta = useMemo(() => ({ date }), [date])
  const { tableProps, tableQueryResult } = useTable<LessonItem>({
    resource: 'schedule',
    syncWithLocation: false,
    filters: scheduleFilters,
    meta: scheduleMeta,
  })

  const mutateCreate = useCreate()
  const mutateUpdate = useUpdate()
  const mutateDelete = useDelete()

  const serverList = (tableProps.dataSource ?? []) as unknown as LessonItem[]
  const displayList: LessonRow[] = useMemo(() => {
    const fromServer = serverList.filter((r) => !deletedIds.has(r.id))
    return [...fromServer, ...newRows]
  }, [serverList, deletedIds, newRows])

  const hasChanges = newRows.length > 0 || Object.keys(modified).length > 0 || deletedIds.size > 0

  const subjectName = Form.useWatch('subjectName', form)
  const subjectNameOptions = useMemo(() => {
    const names = new Set<string>()
    subjects.forEach((s) => s.name?.trim() && names.add(s.name.trim()))
    return Array.from(names).sort()
  }, [subjects])
  const groupOptionsForSubject = useMemo(() => {
    if (!subjectName) return []
    const list = subjects.filter((s) => s.name?.trim() === subjectName)
    const seen = new Set<string>()
    return list
      .map((s) => {
        const id = s.group?.id ?? s.groupId
        if (!id || seen.has(id)) return null
        seen.add(id)
        return { value: id, label: s.group?.name ?? id }
      })
      .filter(Boolean) as { value: string; label: string }[]
  }, [subjects, subjectName])

  const resolveSubjectId = (name: string, groupId: string) =>
    subjects.find((s) => s.name?.trim() === name && (s.group?.id === groupId || s.groupId === groupId))?.id

  /** Часы с 8:00 до 18:00 включительно */
  const disabledHours = useCallback(
    () => [...Array(8).keys(), ...Array.from({ length: 5 }, (_, i) => 19 + i)],
    []
  )

  /** Собирает дату из выбранной даты в шапке и времени из формы */
  const buildDateTime = (dateStr: string, timeValue: Dayjs | null | undefined): string => {
    if (!timeValue) return ''
    return dayjs(`${dateStr} ${dayjs(timeValue).format('HH:mm')}`).toISOString()
  }

  const handleAddDraft = () => {
    form.resetFields()
    setEditingRow(null)
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = () => {
    form.validateFields().then((values) => {
      const subjectId = resolveSubjectId(values.subjectName, values.groupId)
      if (!subjectId) {
        message.error('Выберите предмет и группу')
        return
      }
      const startsAt = buildDateTime(date, values.startsAt)
      const endsAt = buildDateTime(date, values.endsAt)
      if (!startsAt || !endsAt) {
        message.error('Укажите начало и конец урока')
        return
      }
      const draft: DraftLesson = {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        _isNew: true,
        subjectId,
        startsAt,
        endsAt,
        room: values.room,
        subject: subjects.find((s) => s.id === subjectId)
          ? { id: subjectId, name: subjects.find((s) => s.id === subjectId)!.name }
          : undefined,
        group: subjects.find((s) => s.id === subjectId)?.group
          ? { ...subjects.find((s) => s.id === subjectId)!.group }
          : undefined,
        teacher: (() => {
          const s = subjects.find((s) => s.id === subjectId)?.teacher
          return s ? { firstName: s.firstName, lastName: s.lastName } : undefined
        })(),
      }
      setNewRows((prev) => [...prev, draft])
      setCreateModalOpen(false)
      form.resetFields()
    })
  }

  const openEdit = useCallback(
    (row: LessonRow) => {
      setEditingRow(row)
      setCreateModalOpen(false)
      const subj = row.subject ?? (row as LessonItem).subject
      const gr = row.group ?? (row as LessonItem).group
      form.setFieldsValue({
        subjectName: subj?.name ?? '',
        groupId: gr?.id ?? undefined,
        startsAt: row.startsAt ? dayjs(row.startsAt) : null,
        endsAt: row.endsAt ? dayjs(row.endsAt) : null,
        room: row.room,
      })
    },
    [form]
  )

  const handleEditSubmit = () => {
    if (!editingRow) return
    form.validateFields().then((values) => {
      const subjectId = resolveSubjectId(values.subjectName, values.groupId)
      if (!subjectId) {
        message.error('Выберите предмет и группу')
        return
      }
      const startsAt = buildDateTime(date, values.startsAt)
      const endsAt = buildDateTime(date, values.endsAt)
      if (!startsAt || !endsAt) {
        message.error('Укажите начало и конец урока')
        return
      }
      const payload = {
        subjectId,
        startsAt,
        endsAt,
        room: values.room,
      }
      if (isDraft(editingRow)) {
        setNewRows((prev) =>
          prev.map((r) =>
            r.id === editingRow.id
              ? {
                ...r,
                ...payload,
                subject: subjects.find((s) => s.id === subjectId)
                  ? { id: subjectId, name: subjects.find((s) => s.id === subjectId)!.name }
                  : r.subject,
                group: subjects.find((s) => s.id === subjectId)?.group
                  ? { ...subjects.find((s) => s.id === subjectId)!.group }
                  : r.group,
                teacher: (() => {
                  const s = subjects.find((s) => s.id === subjectId)?.teacher
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

  const handleDeleteRow = useCallback((row: LessonRow) => {
    if (isDraft(row)) {
      setNewRows((prev) => prev.filter((r) => r.id !== row.id))
    } else {
      setDeletedIds((prev) => new Set(prev).add(row.id))
    }
  }, [])

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

  /** При смене дня сбрасываем черновики и правки — показываем только расписание выбранного дня */
  const handleDateChange = (d: Dayjs | null) => {
    if (!d) return
    setDate(d.format('YYYY-MM-DD'))
    setNewRows([])
    setModified({})
    setDeletedIds(new Set())
    setCreateModalOpen(false)
    setEditingRow(null)
    form.resetFields()
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.endsWith('.xlsx')) {
      message.warning('Нужен файл Excel (.xlsx)')
      return
    }
    setImportLoading(true)
    try {
      const res = await importScheduleFromExcel(file)
      tableQueryResult?.refetch()
      const parts: string[] = []
      if (res.created > 0) parts.push(`создано: ${res.created}`)
      if (res.skipped > 0) parts.push(`пропущено: ${res.skipped}`)
      if (parts.length) message.success(parts.join(', '))
      if (res.errors?.length) {
        message.warning(res.errors.slice(0, 3).join('; ') + (res.errors.length > 3 ? ` и ещё ${res.errors.length - 3}` : ''))
      }
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Ошибка импорта')
    } finally {
      setImportLoading(false)
    }
  }

  const datePickerValue = useMemo(() => dayjs(date), [date])

  const tableColumns = useMemo(
    () => [
      {
        title: 'Время',
        key: 'time',
        render: (_: unknown, r: LessonRow) =>
          `${dayjs(r.startsAt).format('HH:mm')} – ${dayjs(r.endsAt).format('HH:mm')}`,
      },
      {
        title: 'Предмет',
        key: 'subject',
        render: (_: unknown, r: LessonRow) => r.subject?.name ?? '—',
      },
      {
        title: 'Группа',
        key: 'group',
        render: (_: unknown, r: LessonRow) => r.group?.name ?? '—',
      },
      {
        title: 'Учитель',
        key: 'teacher',
        render: (_: unknown, r: LessonRow) =>
          r.teacher ? [r.teacher.lastName, r.teacher.firstName].filter(Boolean).join(' ') : '—',
      },
      { title: 'Аудитория', dataIndex: 'room', key: 'room', render: (v: string) => v ?? '—' },
      {
        title: '',
        key: 'actions',
        render: (_: unknown, record: LessonRow) => (
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
    ],
    [openEdit, handleDeleteRow]
  )

  return (
    <List
      title="Расписание"
      headerButtons={
        <>
          <DatePicker
            value={datePickerValue}
            onChange={handleDateChange}
            allowClear={false}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <Tooltip
            title="Формат: первая строка — с колонки D названия групп (БЭ13, И14-1 и т.д.). Далее блоки по 3 строки: предмет, преподаватель, кабинет."
          >
            <Button loading={importLoading} onClick={handleImportClick}>
              Импорт из Excel
            </Button>
          </Tooltip>
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
        columns={tableColumns}
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
          <Form.Item name="subjectName" label="Предмет" rules={[{ required: true, message: 'Выберите предмет' }]}>
            <Select
              placeholder="Название предмета"
              options={subjectNameOptions.map((n) => ({ value: n, label: n }))}
              showSearch
              optionFilterProp="label"
              onChange={() => form.setFieldValue('groupId', undefined)}
            />
          </Form.Item>
          <Form.Item name="groupId" label="Группа" rules={[{ required: true, message: 'Выберите группу' }]}>
            <Select
              placeholder="Группа"
              options={groupOptionsForSubject}
              showSearch
              optionFilterProp="label"
              disabled={!subjectName}
            />
          </Form.Item>
          <Form.Item name="startsAt" label="Начало" rules={[{ required: true, message: 'Укажите время начала' }]}>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              placeholder="Например 08:15"
              style={{ width: '100%' }}
              disabledHours={disabledHours}
              hideDisabledOptions
              popupClassName="schedule-time-picker-dropdown"
            />
          </Form.Item>
          <Form.Item name="endsAt" label="Конец" rules={[{ required: true, message: 'Укажите время окончания' }]}>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              placeholder="Например 09:00"
              style={{ width: '100%' }}
              disabledHours={disabledHours}
              hideDisabledOptions
              popupClassName="schedule-time-picker-dropdown"
            />
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
          <Form.Item name="subjectName" label="Предмет" rules={[{ required: true, message: 'Выберите предмет' }]}>
            <Select
              placeholder="Название предмета"
              options={subjectNameOptions.map((n) => ({ value: n, label: n }))}
              showSearch
              optionFilterProp="label"
              onChange={() => form.setFieldValue('groupId', undefined)}
            />
          </Form.Item>
          <Form.Item name="groupId" label="Группа" rules={[{ required: true, message: 'Выберите группу' }]}>
            <Select
              placeholder="Группа"
              options={groupOptionsForSubject}
              showSearch
              optionFilterProp="label"
              disabled={!subjectName}
            />
          </Form.Item>
          <Form.Item name="startsAt" label="Начало" rules={[{ required: true, message: 'Укажите время начала' }]}>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              placeholder="Например 08:15"
              style={{ width: '100%' }}
              disabledHours={disabledHours}
              hideDisabledOptions
              popupClassName="schedule-time-picker-dropdown"
            />
          </Form.Item>
          <Form.Item name="endsAt" label="Конец" rules={[{ required: true, message: 'Укажите время окончания' }]}>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              placeholder="Например 09:00"
              style={{ width: '100%' }}
              disabledHours={disabledHours}
              hideDisabledOptions
              popupClassName="schedule-time-picker-dropdown"
            />
          </Form.Item>
          <Form.Item name="room" label="Аудитория">
            <Input maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  )
}
