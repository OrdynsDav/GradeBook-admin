import { useState } from 'react'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Modal, Form, InputNumber, Input, message } from 'antd'
import { useList, useCreate, useUpdate } from '@refinedev/core'
import type { Group, CreateGroupRequest } from '@/types/api'

export function GroupsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [form] = Form.useForm()

  const { tableProps, tableQueryResult } = useTable<Group>({
    resource: 'groups',
    syncWithLocation: true,
  })
  const createMutation = useCreate()
  const updateMutation = useUpdate()

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
        <Table
          {...tableProps}
          rowKey="id"
          columns={[
            { title: 'Название', dataIndex: 'name', key: 'name' },
            { title: 'Курс', dataIndex: 'course', key: 'course', width: 80 },
            { title: 'Название группы', dataIndex: 'groupName', key: 'groupName', width: 140 },
            {
              title: '',
              key: 'actions',
              width: 100,
              render: (_, record: Group) => (
                <Button type="link" size="small" onClick={() => openEdit(record)}>
                  Изменить
                </Button>
              ),
            },
          ]}
        />
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
