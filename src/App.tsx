import { Refine } from '@refinedev/core'
import { ThemedLayoutV2 } from '@refinedev/antd'
import { Authenticated } from '@refinedev/core'
import routerBindings from '@refinedev/react-router-v6'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { authProvider } from '@/authProvider'

const theme = {
  token: {
    colorPrimary: '#8F1D3D',
  },
}

const i18nProvider = {
  translate: (key: string, _options?: unknown, defaultMessage?: string) => {
    if (key === 'buttons.logout') return 'Выйти'
    if (key === 'buttons.save') return 'Сохранить'
    return defaultMessage ?? key
  },
  changeLocale: async () => undefined,
  getLocale: () => 'ru',
}

import { dataProvider } from '@/dataProvider'
import { Login } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { CreateUserPage } from '@/pages/CreateUser'
import { SubjectsPage } from '@/pages/Subjects'
import { SchedulePage } from '@/pages/Schedule'

function App() {
  return (
    <ConfigProvider locale={ruRU} theme={theme}>
      <Refine
        dataProvider={{ default: dataProvider }}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        routerProvider={routerBindings}
        resources={[
          { name: 'dashboard', list: '/', meta: { label: 'Главная' } },
          { name: 'users', list: '/users/create', create: '/users/create', meta: { label: 'Создать пользователя' } },
          { name: 'subjects', list: '/subjects', meta: { label: 'Предметы' } },
          { name: 'schedule', list: '/schedule', meta: { label: 'Расписание' } },
        ]}
        options={{ syncWithLocation: true }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Authenticated key="app" fallback={<Navigate to="/login" replace />}>
                <ThemedLayoutV2>
                  <Outlet />
                </ThemedLayoutV2>
              </Authenticated>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/users/create" element={<CreateUserPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
          </Route>
        </Routes>
      </Refine>
    </ConfigProvider>
  )
}

export default App
