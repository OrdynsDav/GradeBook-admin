import { useState } from 'react'
import { Checkbox, Dropdown } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { Group } from '@/types/api'

export function GroupIdsDropdown({
  groups,
  value = [],
  onChange,
  placeholder = 'Выберите группы (несколько)',
  style,
}: {
  groups: Group[]
  value?: string[]
  onChange?: (ids: string[]) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const selectedNames =
    groups.filter((g) => (value ?? []).includes(g.id)).map((g) => g.name).join(', ') || placeholder

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      dropdownRender={() => (
        <div
          style={{
            padding: 12,
            background: '#fff',
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            borderRadius: 8,
            minWidth: 220,
            maxHeight: 320,
            overflow: 'auto',
          }}
        >
          <Checkbox.Group
            value={value ?? []}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            onChange={(ids) => onChange?.(ids as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          />
        </div>
      )}
    >
      <div
        style={{
          cursor: 'pointer',
          border: '1px solid #d9d9d9',
          padding: '4px 11px',
          borderRadius: 6,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          ...style,
        }}
      >
        <span style={{ color: value?.length ? undefined : '#bfbfbf' }}>{selectedNames}</span>
        <DownOutlined style={{ fontSize: 10, marginLeft: 8 }} />
      </div>
    </Dropdown>
  )
}
