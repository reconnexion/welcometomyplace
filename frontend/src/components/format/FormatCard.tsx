import { Card } from 'antd';
import { Link } from 'react-router';

import type { FormatRecord } from '../../types';

type Props = {
  format: FormatRecord;
};

const FormatCard = ({ format }: Props) => (
  <Link to={`/formats/${encodeURIComponent(format.id)}`}>
    <Card
      hoverable
      style={{ borderRadius: 0 }}
      styles={{ body: { padding: 16 } }}
      cover={format.image && <div style={{ height: 140, backgroundImage: `url("${format.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
    >
      <h3 style={{ margin: '0 0 8px', fontFamily: 'inherit' }}>{format['rdfs:label']}</h3>
      <p
        style={{
          margin: 0,
          color: 'rgba(0,0,0,0.65)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.2em',
          height: '3.6em'
        }}
      >
        {format.summary}
      </p>
    </Card>
  </Link>
);

export default FormatCard;
