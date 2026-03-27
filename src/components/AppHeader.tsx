import { Layout as AntdLayout, Typography, Avatar, Space, theme } from 'antd'
import { useGetIdentity, useActiveAuthProvider, pickNotDeprecated } from '@refinedev/core'
import type { RefineThemedLayoutV2HeaderProps } from '@refinedev/antd'

export function AppHeader(props: RefineThemedLayoutV2HeaderProps) {
  const { isSticky, sticky } = props
  const { token } = theme.useToken()
  const authProvider = useActiveAuthProvider()
  const { data: identity } = useGetIdentity({
    v3LegacyAuthProviderCompatible: Boolean(authProvider?.isLegacy),
  })

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '0 24px',
    height: '64px',
  }

  if (pickNotDeprecated(sticky, isSticky)) {
    headerStyles.position = 'sticky'
    headerStyles.top = 0
    headerStyles.zIndex = 1
  }

  const shouldRenderHeader = identity && (identity.name || identity.avatar)
  if (!shouldRenderHeader) return null

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space size="middle">
        {identity?.name && <Typography.Text strong>{identity.name}</Typography.Text>}
        {identity?.avatar && <Avatar src={identity.avatar} alt={identity.name} />}
      </Space>
    </AntdLayout.Header>
  )
}

