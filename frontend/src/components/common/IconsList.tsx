import type { ReactNode } from 'react';
import { Divider } from 'antd';

export type IconListItem = {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
};

type Props = {
  items: IconListItem[];
  orientation?: 'horizontal' | 'vertical';
};

/** Row of icon + label + value blocks (organizer / date / duration on events), horizontal on
 *  the show page header, vertical in the sidebar join card. */
const IconsList = ({ items, orientation = 'horizontal' }: Props) => {
  const visible = items.filter(item => item.value !== undefined && item.value !== null && item.value !== '');
  if (visible.length === 0) return null;
  const isVertical = orientation === 'vertical';

  return (
    <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', flexWrap: 'wrap', alignItems: isVertical ? 'stretch' : 'center' }}>
      {visible.map((item, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', alignItems: isVertical ? 'stretch' : 'center' }}>
          {i > 0 && <Divider type={isVertical ? 'horizontal' : 'vertical'} style={{ borderColor: '#000', margin: isVertical ? '12px 0' : '0 20px', height: isVertical ? undefined : '2.5em' }} />}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {item.icon && <span style={{ fontSize: '1.5rem', lineHeight: '1.5rem', marginTop: 2 }}>{item.icon}</span>}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 16 }}>{item.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IconsList;
