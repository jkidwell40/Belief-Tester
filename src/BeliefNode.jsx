import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function BeliefNode({ id, data }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const status = data.status || 'pending';
  const nodeStyle = {
    padding: 10,
    border: '2px solid black',
    borderRadius: 10,
    background: 'white',
    minWidth: 200,
    cursor: 'pointer',
    borderColor:
      status === 'coherent' ? 'green' :
      status === 'contradictory' ? 'yellow' :
      status === 'harmful' ? 'red' :
      status === 'incoherent' ? 'brown' :
      'gray'
  };

  return (
    <div style={nodeStyle} onClick={() => setExpanded(!expanded)}>
      <div><strong>{data?.label || 'Unnamed Belief'}</strong></div>

      {expanded && data?.aiSummary && (
        <div style={{ marginTop: 8 }}>
          <div><strong>TL;DR:</strong> {data.aiSummary?.summary || '—'}</div>
          <div style={{ marginTop: 6 }}><strong>Details:</strong> {data.aiSummary?.details || '—'}</div>
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
