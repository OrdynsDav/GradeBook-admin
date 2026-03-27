import { useState, useMemo } from 'react'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Modal, Form, InputNumber, Input, message, Pagination, Popconfirm, Space } from 'antd'
import { useCreate, useUpdate, useDelete } from '@refinedev/core'
import type { Group, CreateGroupRequest } from '@/types/api'
import './Groups.css'

export function GroupsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [coursePage, setCoursePage] = useState(1)
  const [form] = Form.useForm()

  const { tableProps, tableQueryResult } = useTable<Group>({
    resource: 'groups',
    syncWithLocation: true,
    pagination: { pageSize: 9999 },
  })

  const allGroups = (tableProps.dataSource ?? []) as Group[]
  const courseNumbers = useMemo(
    () => [...new Set(allGroups.map((g) => g.course).filter(Boolean))].sort((a, b) => (a ?? 0) - (b ?? 0)) as number[],
    [allGroups]
  )
  const currentCourse = courseNumbers[coursePage - 1] ?? courseNumbers[0] ?? null
  const groupsOnPage = useMemo(
    () => (currentCourse != null ? allGroups.filter((g) => g.course === currentCourse) : []),
    [allGroups, currentCourse]
  )
  const totalCoursePages = courseNumbers.length
  const createMutation = useCreate()
  const updateMutation = useUpdate()
  const deleteMutation = useDelete()

  const openCreate = () => {
    setEditingGroup(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Group) => {
    setEditingGroup(record)
    form.setFieldsValue({
      course: record.course ?? 1,
      groupName: record.groupName ?? record.name ?? '',
    })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values: CreateGroupRequest) => {
        const variables = {
          course: Number(values.course),
          groupName: String(values.groupName ?? '').trim(),
        }
        if (editingGroup) {
          updateMutation.mutate(
            { resource: 'groups', id: editingGroup.id, values: variables },
            {
              onSuccess: () => {
                message.success('Группа изменена')
                setModalOpen(false)
                setEditingGroup(null)
                form.resetFields()
                tableQueryResult?.refetch()
              },
              onError: (err: any) => {
                const d = err?.response?.data
                const msg =
                  (typeof d?.message === 'string' && d.message) ||
                  (Array.isArray(d?.message) ? d.message.join(', ') : null) ||
                  err?.message ||
                  'Ошибка изменения группы'
                message.error(msg)
              },
            }
          )
        } else {
          createMutation.mutate(
            { resource: 'groups', values: variables },
            {
              onSuccess: () => {
                message.success('Группа создана')
                setModalOpen(false)
                form.resetFields()
                tableQueryResult?.refetch()
              },
              onError: (err: any) => {
                const d = err?.response?.data
                const msg =
                  (typeof d?.message === 'string' && d.message) ||
                  (Array.isArray(d?.message) ? d.message.join(', ') : null) ||
                  err?.message ||
                  'Ошибка создания группы'
                message.error(msg)
              },
            }
          )
        }
      })
      .catch(() => {})
  }

  const handleCancel = () => {
    setModalOpen(false)
    setEditingGroup(null)
    form.resetFields()
  }

  const handleDelete = (record: Group) => {
    deleteMutation.mutate(
      { resource: 'groups', id: record.id },
      {
        onSuccess: () => {
          message.success('Группа удалена')
          tableQueryResult?.refetch()
        },
        onError: (err: unknown) => {
          const d = (err as { response?: { data?: { message?: string } } })?.response?.data
          const msg = typeof d?.message === 'string' ? d.message : 'Ошибка удаления группы'
          message.error(msg)
        },
      }
    )
  }

  const isEditing = !!editingGroup
  const isLoading = createMutation.isLoading || updateMutation.isLoading

  return (
    <>
      <List
        title="Группы"
        headerButtons={
          <Button type="primary" onClick={openCreate}>
            Создать группу
          </Button>
        }
      >
        <>
          <Table
            {...tableProps}
            dataSource={groupsOnPage}
            rowKey="id"
            pagination={false}
            columns={[
            { title: 'Название', dataIndex: 'name', key: 'name' },
            { title: 'Курс', dataIndex: 'course', key: 'course', width: 80 },
            { title: 'Название группы', dataIndex: 'groupName', key: 'groupName', width: 140 },
            {
              title: '',
              key: 'actions',
              width: 160,
              render: (_, record: Group) => (
                <Space>
                  <Button type="link" size="small" onClick={() => openEdit(record)}>
                    Изменить
                  </Button>
                  <Popconfirm
                    title="Удалить группу?"
                    description="Связанные уроки и предметы будут удалены, у студентов группы сбросится группа."
                    onConfirm={() => handleDelete(record)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="link" size="small" danger>
                      Удалить
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          />
          {totalCoursePages > 0 && (
            <div className="groups-course-pagination" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                {currentCourse != null ? `Курс ${currentCourse} (${groupsOnPage.length} групп)` : 'Нет групп'}
              </span>
              <Pagination
                current={Math.min(coursePage, totalCoursePages)}
                total={totalCoursePages}
                pageSize={1}
                showSizeChanger={false}
                onChange={(page) => setCoursePage(page)}
                itemRender={(page, type, originalElement) => {
                  if (type === 'page' && page != null) {
                    const courseNum = courseNumbers[page - 1]
                    return courseNum != null ? `Курс ${courseNum}` : originalElement
                  }
                  return originalElement
                }}
              />
            </div>
          )}
        </>
      </List>

      <Modal
        title={isEditing ? 'Изменить группу' : 'Создать группу'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText={isEditing ? 'Сохранить' : 'Создать'}
        confirmLoading={isLoading}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="course"
            label="Курс"
            rules={[{ required: true }, { type: 'number', min: 1, max: 4 }]}
          >
            <InputNumber min={1} max={4} style={{ width: '100%' }} placeholder="1–4" />
          </Form.Item>
          <Form.Item
            name="groupName"
            label="Название группы"
            rules={[
              { required: true, message: 'Введите название группы' },
              { max: 32, message: 'Не более 32 символов' },
            ]}
          >
            <Input maxLength={32} placeholder="Например: И14-1" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
