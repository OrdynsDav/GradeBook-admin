import { Link } from 'react-router-dom'
import { Button, Card, Space, Typography } from 'antd'
import { UserAddOutlined, CalendarOutlined, BookOutlined } from '@ant-design/icons'

export function DashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={2}>Главная</Typography.Title>
      <Typography.Paragraph type="secondary">
        Добро пожаловать в админ-панель GradeBook.
      </Typography.Paragraph>
      <Space wrap size="middle">
        <Card size="small" style={{ width: 260 }}>
          <Space direction="vertical" size="small">
            <UserAddOutlined style={{ fontSize: 24, color: '#8F1D3D' }} />
            <Typography.Text strong>Создать пользователя</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Студент или учитель
            </Typography.Text>
            <Link to="/users/create">
              <Button type="primary">Перейти</Button>
            </Link>
          </Space>
        </Card>
        <Card size="small" style={{ width: 260 }}>
          <Space direction="vertical" size="small">
            <BookOutlined style={{ fontSize: 24, color: '#8F1D3D' }} />
            <Typography.Text strong>Предметы</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Список предметов
            </Typography.Text>
            <Link to="/subjects">
              <Button>Перейти</Button>
            </Link>
          </Space>
        </Card>
        <Card size="small" style={{ width: 260 }}>
          <Space direction="vertical" size="small">
            <CalendarOutlined style={{ fontSize: 24, color: '#8F1D3D' }} />
            <Typography.Text strong>Расписание</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Уроки на неделю
            </Typography.Text>
            <Link to="/schedule">
              <Button>Перейти</Button>
            </Link>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
