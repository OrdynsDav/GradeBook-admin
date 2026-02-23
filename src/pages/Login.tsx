import { useLogin } from '@refinedev/core'
import { Layout, Card, Form, Input, Button, Typography } from 'antd'

export function Login() {
  const { mutate: login, isLoading } = useLogin()

  return (
    <Layout style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 400 }} title="GradeBook — Админ-панель">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Вход в систему
        </Typography.Text>
        <Form
          layout="vertical"
          onFinish={(values) => login({ login: values.login, password: values.password })}
          initialValues={{ login: 'admin', password: 'Password123!' }}
        >
          <Form.Item
            name="login"
            label="Логин"
            rules={[{ required: true, message: 'Введите логин' }]}
          >
            <Input placeholder="Логин" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password placeholder="Пароль" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  )
}
