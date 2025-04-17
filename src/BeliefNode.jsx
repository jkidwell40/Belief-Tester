import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function BeliefNode({ id, data }) {
  const [expanded, setExpanded] = useState(false);

  const nodeStyle = {
    padding: 10,
    border: '2px solid black',
    borderRadius: 10,
    background: 'white',
    minWidth: 200,
    cursor: 'pointer',
    borderColor:
      data.status === 'coherent' ? 'green' :
      data.status === 'contradictory' ? 'yellow' :
      data.status === 'harmful' ? 'red' :
      data.status === 'incoherent' ? 'brown' : 'gray'
  };

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div onClick={handleToggle} style={nodeStyle}>
      <div><strong>{data.label}</strong></div>
      {expanded && data.aiSummary && (
        <div style={{ marginTop: 8 }}>
          <div><strong>TL;DR:</strong> {data.aiSummary.summary}</div>
          <div style={{ marginTop: 6 }}><strong>Details:</strong> {data.aiSummary.details}</div>
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}