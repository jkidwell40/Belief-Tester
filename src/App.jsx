import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import BeliefNode from './BeliefNode.jsx';

const nodeTypes = { beliefNode: BeliefNode };

export default function App() {
  const [mode, setMode] = useState(null);
  const [coreBelief, setCoreBelief] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [suggestedBelief, setSuggestedBelief] = useState(null);

  const radius = 250;
  const angleIncrement = 360 / 20;

  useEffect(() => {
  if (!mode) {
    let selected = null;
    while (!selected || (selected !== 'sandbox' && selected !== 'professional')) {
      selected = prompt("Enter mode: sandbox or professional");
      if (selected === null) return; // User cancelled — exit gracefully
      selected = selected.toLowerCase();
    }
    setMode(selected);
  }
}, [mode]);


  const handleAddCoreBelief = () => {
    let belief = null;
    while (!belief) {
      belief = prompt("Enter your core belief:");
      if (belief === null) return; // user canceled
    }

    const notes = prompt("Optional: Enter core context notes:");
    const confidence = 100;
    const id = 'core';

    const coreNode = {
      id,
      type: 'beliefNode',
      position: { x: 400, y: 300 },
      data: {
        label: belief,
        notes,
        confidence,
        core: true,
        status: 'core',
        mode
      },
      draggable: false
    };

    setCoreBelief(coreNode);
    setNodes([coreNode]);
  };

  useEffect(() => {
    if (mode && !coreBelief) {
      handleAddCoreBelief();
    }
  }, [mode, coreBelief]);

  const getUpstream = (nodeId, visited = new Set()) => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const incoming = edges.filter(e => e.target === nodeId).map(e => e.source);
    const upstreamNodes = incoming.map(id => nodes.find(n => n.id === id)).filter(Boolean);
    return upstreamNodes.flatMap(n => [n.data.label, ...getUpstream(n.id, visited)]);
  };

  const addBelief = async () => {
    const belief = prompt("Enter your belief:");
    const notes = prompt("Optional notes or justification:");
    const confidence = parseInt(prompt("Confidence (0-100):"), 10);

    const id = uuidv4();
    const upstream = getUpstream('core');
    const coreLabel = coreBelief?.data?.label || '';

    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      body: JSON.stringify({
        coreBeliefs: [coreLabel],
        upstreamBeliefs: upstream,
        newBelief: belief,
        confidence,
        userNotes: notes
      })
    });
    const result = await response.json();

    const angle = (nodes.length - 1) * angleIncrement;
    const x = 400 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 300 + radius * Math.sin((angle * Math.PI) / 180);

    const newNode = {
      id,
      type: 'beliefNode',
      position: { x, y },
      data: {
        label: belief,
        confidence,
        notes,
        status: result.status,
        aiSummary: result,
        mode,
        core: false
      }
    };

    setNodes((prev) => [...prev, newNode]);
    setEdges((prev) => [...prev, {
      id: `${coreBelief.id}->${id}`,
      source: coreBelief.id,
      target: id,
      style: {
        stroke: result.status === 'coherent' ? 'green'
              : result.status === 'contradictory' ? 'yellow'
              : result.status === 'harmful' ? 'red'
              : result.status === 'incoherent' ? 'brown' : 'gray',
        strokeWidth: 2
      }
    }]);
  };

  const handleSuggest = async () => {
    const beliefList = nodes.map(n => n.data.label);
    const response = await fetch('/.netlify/functions/suggest', {
      method: 'POST',
      body: JSON.stringify({ existingBeliefs: beliefList })
    });
    const result = await response.json();
    setSuggestedBelief(result.suggestion);
  };

  const handleAcceptSuggestion = () => {
    setSuggestedBelief(null);
    addBelief(suggestedBelief);
  };

  if (!mode) {
  return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Loading mode selection…</div>;
}

if (!coreBelief) {
  return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Awaiting core belief input…</div>;
}


  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {mode === 'sandbox' && (
        <div className="watermark"><div className="watermark-text">PRACTICE MODE</div></div>
      )}

      <button onClick={addBelief} style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000 }}>
        Add Belief
      </button>

      {mode === 'sandbox' && (
        <button onClick={handleSuggest} style={{ position: 'fixed', top: 10, left: 120, zIndex: 1000 }}>
          Suggest Belief (AI)
        </button>
      )}

      {suggestedBelief && (
        <div style={{ position: 'fixed', top: 60, left: 120, background: 'white', zIndex: 1000, padding: 10 }}>
          <div><strong>AI Suggests:</strong> {suggestedBelief}</div>
          <button onClick={handleAcceptSuggestion}>Accept</button>
          <button onClick={() => setSuggestedBelief(null)}>Dismiss</button>
        </div>
      )}

      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          nodeTypes={nodeTypes}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
