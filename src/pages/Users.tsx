import { useState, useEffect } from 'react'
import { List, useTable } from '@refinedev/antd'
import { Table, Button, Select, Space, Modal, Form, Input, InputNumber, Popconfirm, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useGo, useOne, useUpdate, useDelete, useList } from '@refinedev/core'
import { GroupIdsDropdown } from '@/components/GroupIdsDropdown'
import type {
  User,
  CreatableRole,
  Group,
  UpdateUserByAdminRequest,
} from '@/types/api'

const roleFilterOptions = [
  { value: 'all', label: 'Все' },
  { value: 'teacher', label: 'Только учителя' },
  { value: 'student', label: 'Только ученики' },
]

const roleOptions: { value: CreatableRole; label: string }[] = [
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
]

function roleLabel(role: string) {
  if (role === 'teacher') return 'Учитель'
  if (role === 'student') return 'Ученик'
  return role
}

export function UsersPage() {
  const go = useGo()
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const { tableProps, tableQueryResult } = useTable<User>({
    resource: 'users',
    syncWithLocation: false,
    filters: {
      permanent: [{ field: 'role', operator: 'eq', value: roleFilter }],
    },
  })

  const { data: userData } = useOne<User>({
    resource: 'users',
    id: editingId ?? undefined,
    queryOptions: { enabled: !!editingId },
  })
  const editingUser = userData?.data

  const { data: groupsData } = useList<Group>({ resource: 'groups' })
  const groups: Group[] = groupsData?.data ?? []

  const updateMutation = useUpdate()
  const deleteMutation = useDelete()

  useEffect(() => {
    if (!editingUser || !editingId) return
    const u = editingUser as User
    const role = u.role === 'admin' ? 'teacher' : u.role
    form.setFieldsValue({
      role,
      firstName: u.firstName,
      lastName: u.lastName,
      middleName: u.middleName ?? '',
      login: u.login,
      password: undefined,
      course: u.group?.course ?? undefined,
      group: u.group?.groupName ?? u.group?.name ?? '',
      subjects: [],
    })
  }, [editingUser, editingId, form])

  const handleEdit = (record: User) => {
    setEditingId(record.id)
  }

  const handleCloseEdit = () => {
    setEditingId(null)
    form.resetFields()
  }

  const handleUpdateSubmit = () => {
    form.validateFields().then((values) => {
      if (!editingId) return
      const payload: UpdateUserByAdminRequest = {
        role: values.role,
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName || undefined,
        login: values.login,
      }
      if (values.password?.trim()) payload.password = values.password.trim()
      if (values.role === 'student') {
        payload.course = values.course
        payload.group = values.group
      }
      if (values.role === 'teacher' && Array.isArray(values.subjects) && values.subjects.length > 0) {
        payload.subjects = values.subjects
          .filter((s: any) => s?.name?.trim())
          .map((s: any) => {
            const ids = s.groupIds ?? []
            const groupNames = ids
              .map((id: string) => groups.find((g) => g.id === id)?.name)
              .filter(Boolean) as string[]
            return { name: String(s.name).trim(), groups: groupNames }
          })
          .filter((s: { groups: string[] }) => s.groups.length > 0)
      }
      updateMutation.mutate(
        { resource: 'users', id: editingId, values: payload },
        {
          onSuccess: () => {
            message.success('Пользователь изменён')
            handleCloseEdit()
            tableQueryResult?.refetch()
          },
          onError: (err: any) => {
            message.error(err?.response?.data?.message ?? 'Ошибка сохранения')
          },
        }
      )
    })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { resource: 'users', id },
      {
        onSuccess: () => {
          message.success('Пользователь удалён')
          tableQueryResult?.refetch()
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message ?? 'Ошибка удаления')
        },
      }
    )
  }

  const role = Form.useWatch('role', form)

  return (
    <>
      <List
        title="Пользователи"
        headerButtons={
          <Space>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleFilterOptions}
              style={{ width: 180 }}
            />
            <Button type="primary" onClick={() => go({ to: '/users/create' })}>
              Создать пользователя
            </Button>
          </Space>
        }
      >
        <Table
          {...tableProps}
          rowKey="id"
          columns={[
            {
              title: 'ФИО',
              key: 'name',
              render: (_, r: User) =>
                [r.lastName, r.firstName, r.middleName].filter(Boolean).join(' '),
            },
            { title: 'Логин', dataIndex: 'login', key: 'login', width: 160 },
            {
              title: 'Роль',
              dataIndex: 'role',
              key: 'role',
              width: 120,
              render: (role: string) => roleLabel(role),
            },
            {
              title: '',
              key: 'actions',
              width: 160,
              render: (_, record: User) => (
                <Space>
                  <Button type="link" size="small" onClick={() => handleEdit(record)}>
                    Изменить
                  </Button>
                  <Popconfirm
                    title="Удалить пользователя?"
                    onConfirm={() => handleDelete(record.id)}
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
      </List>

      <Modal
        title="Изменить пользователя"
        open={!!editingId}
        onCancel={handleCloseEdit}
        onOk={handleUpdateSubmit}
        okText="Сохранить"
        confirmLoading={updateMutation.isLoading}
        width={520}
        destroyOnClose
      >
        {editingUser && (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
              <Select options={roleOptions} />
            </Form.Item>
            <Form.Item name="firstName" label="Имя" rules={[{ required: true, min: 1, max: 64 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Фамилия" rules={[{ required: true, min: 1, max: 64 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="middleName" label="Отчество">
              <Input maxLength={64} />
            </Form.Item>
            <Form.Item
              name="login"
              label="Логин"
              rules={[
                { required: true },
                { pattern: /^[a-zA-Z0-9._-]{3,64}$/, message: '3–64 символа, только a-zA-Z0-9._-' },
              ]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Новый пароль (оставьте пустым, чтобы не менять)">
              <Input.Password autoComplete="new-password" placeholder="Не заполняйте, если не меняете" />
            </Form.Item>
            {role === 'student' && (
              <>
                <Form.Item name="course" label="Курс" rules={[{ required: true }, { type: 'number', min: 1, max: 4 }]}>
                  <InputNumber min={1} max={4} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="group" label="Группа" rules={[{ required: true }, { min: 1, max: 32 }]}>
                  <Input maxLength={32} placeholder="Например: И14-1" />
                </Form.Item>
              </>
            )}
            {role === 'teacher' && (
              <Form.Item label="Предметы">
                <Form.List name="subjects">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <div
                          key={key}
                          style={{
                            marginBottom: 8,
                            padding: 8,
                            background: 'rgba(0,0,0,0.02)',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true }]} style={{ marginBottom: 0, flex: 1 }}>
                            <Input placeholder="Название предмета" />
                          </Form.Item>
                          <Form.Item {...rest} name={[name, 'groupIds']} style={{ marginBottom: 0, minWidth: 200 }}>
                            <GroupIdsDropdown groups={groups} placeholder="Группы" />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#999', cursor: 'pointer' }} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Добавить предмет
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </>
  )
}
