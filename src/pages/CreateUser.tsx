import { useGo } from '@refinedev/core'
import { Create, useForm } from '@refinedev/antd'
import { Form, Input, Select, InputNumber } from 'antd'
import type { CreateUserByAdminRequest, CreatableRole } from '@/types/api'

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
      go({ to: '/' })
    },
  })
  const role = Form.useWatch('role', form)

  return (
    <Create
      title="Создать пользователя"
      saveButtonProps={saveButtonProps}
    >
      <Form {...formProps} layout="vertical">
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
              rules={[{ required: true }, { type: 'number', min: 1, max: 8 }]}
            >
              <InputNumber min={1} max={8} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="group"
              label="Группа"
              rules={[{ required: true }, { min: 1, max: 32 }]}
            >
              <Input maxLength={32} />
            </Form.Item>
          </>
        )}
      </Form>
    </Create>
  )
}
