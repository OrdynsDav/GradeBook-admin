import { useGo } from '@refinedev/core'
import { Create, useForm } from '@refinedev/antd'
import { Form, Input, Select, InputNumber, Button, Space } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useList } from '@refinedev/core'
import { GroupIdsDropdown } from '@/components/GroupIdsDropdown'
import type { CreateUserByAdminRequest, CreatableRole, Group } from '@/types/api'

const roleOptions: { value: CreatableRole; label: string }[] = [
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
]

export function CreateUserPage() {
  const go = useGo()
  const { form, formProps, saveButtonProps } = useForm<
    CreateUserByAdminRequest,
    any,
    CreateUserByAdminRequest
  >({
    action: 'create',
    resource: 'users',
    redirect: false,
    onMutationSuccess: () => {
      go({ to: '/users' })
    },
  })
  const role = Form.useWatch('role', form)

  const { data: groupsData } = useList<Group>({ resource: 'groups' })
  const groups: Group[] = groupsData?.data ?? []

  const handleFinish = (values: CreateUserByAdminRequest) => {
    if (role === 'teacher' && Array.isArray(values.subjects)) {
      const subjects = values.subjects
        .filter((s) => s?.name?.trim())
        .map((s) => {
          const ids = (s as { groupIds?: string[] }).groupIds ?? []
          const groupNames = ids
            .map((id) => groups.find((g) => g.id === id)?.name)
            .filter(Boolean) as string[]
          return { name: String(s.name).trim(), groups: groupNames }
        })
        .filter((s) => s.groups.length > 0)
      formProps.onFinish?.({ ...values, subjects })
    } else {
      formProps.onFinish?.(values)
    }
  }

  return (
    <Create
      title="Создать пользователя"
      saveButtonProps={saveButtonProps}
    >
      <Form {...formProps} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="role"
          label="Роль"
          rules={[{ required: true }]}
          initialValue="student"
        >
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
        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, min: 8, max: 128 }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        {role === 'student' && (
          <>
            <Form.Item
              name="course"
              label="Курс"
              rules={[{ required: true }, { type: 'number', min: 1, max: 4 }]}
            >
              <InputNumber min={1} max={4} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="group"
              label="Группа"
              rules={[{ required: true }, { min: 1, max: 32 }]}
            >
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
                        marginBottom: 16,
                        padding: 12,
                        background: 'rgba(0,0,0,0.02)',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0',
                      }}
                    >
                      <Space align="baseline" style={{ marginBottom: 8 }}>
                        <Form.Item
                          {...rest}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Название предмета' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="Название предмета" style={{ width: 220 }} />
                        </Form.Item>
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ color: '#999', cursor: 'pointer' }}
                        />
                      </Space>
                      <Form.Item
                        {...rest}
                        name={[name, 'groupIds']}
                        label="Группы (какие проходят этот предмет)"
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const subjectName = getFieldValue(['subjects', name, 'name'])
                              if (!subjectName?.trim()) return Promise.resolve()
                              if (Array.isArray(value) && value.length > 0) return Promise.resolve()
                              return Promise.reject(new Error('Выберите хотя бы одну группу'))
                            },
                          }),
                        ]}
                      >
                        <GroupIdsDropdown groups={groups} />
                      </Form.Item>
                    </div>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Добавить предмет
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
              Группы создаются в разделе «Группы» или при добавлении студентов. Один предмет можно выбрать для нескольких групп.
            </span>
          </Form.Item>
        )}
      </Form>
    </Create>
  )
}
