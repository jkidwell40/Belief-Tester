import React, { useState, useEffect } from 'react';
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
  const [modalStep, setModalStep] = useState('mode');
  const [modalInput, setModalInput] = useState({ text: '', notes: '', confidence: 100 });
  const [suggestedBelief, setSuggestedBelief] = useState(null);

  const radius = 250;
  const angleIncrement = 360 / 20;

  useEffect(() => {
    if (mode && !coreBelief && modalStep !== 'core') {
      setModalStep('core');
    }
  }, [mode, coreBelief, modalStep]);

  const initializeCoreBelief = () => {
    const id = 'core';
    const node = {
      id,
      type: 'beliefNode',
      position: { x: 400, y: 300 },
      data: {
        label: modalInput.text,
        notes: modalInput.notes,
        confidence: modalInput.confidence,
        core: true,
        status: 'core',
        mode
      },
      draggable: false
    };
    setCoreBelief(node);
    setNodes([node]);
    setModalStep(null);
  };

  const getUpstream = (nodeId, visited = new Set()) => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const incoming = edges.filter(e => e.target === nodeId).map(e => e.source);
    const upstreamNodes = incoming.map(id => nodes.find(n => n.id === id)).filter(Boolean);
    return upstreamNodes.flatMap(n => [n.data.label, ...getUpstream(n.id, visited)]);
  };

  const addBelief = async (text, notes, confidence) => {
    const id = uuidv4();
    const upstream = getUpstream('core');
    const coreLabel = coreBelief?.data?.label || '';

    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      body: JSON.stringify({
        coreBeliefs: [coreLabel],
        upstreamBeliefs: upstream,
        newBelief: text,
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
        label: text,
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
    addBelief(suggestedBelief, '', 50);
  };

  if (!mode || !coreBelief) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
        {modalStep === 'mode' && (
          <div>
            <h3>Select Mode</h3>
            <button onClick={() => { setMode('sandbox'); setModalStep('core'); }}>Sandbox</button>
            <button onClick={() => { setMode('professional'); setModalStep('core'); }}>Professional</button>
          </div>
        )}
        {modalStep === 'core' && (
          <div>
            <h3>Enter Core Belief</h3>
            <input
              placeholder="Core belief"
              value={modalInput.text}
              onChange={(e) => setModalInput({ ...modalInput, text: e.target.value })}
            />
            <textarea
              placeholder="Context or notes"
              value={modalInput.notes}
              onChange={(e) => setModalInput({ ...modalInput, notes: e.target.value })}
            />
            <input
              type="range"
              min={0} max={100}
              value={modalInput.confidence}
              onChange={(e) => setModalInput({ ...modalInput, confidence: parseInt(e.target.value) })}
            />
            <button onClick={initializeCoreBelief}>Enter</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {mode === 'sandbox' && (
 <div className="watermark">
  {Array.from({ length: 50 }).map((_, i) => (
    <div key={i} className="watermark-text">SANDBOX MODE</div>
  ))}
</div>

      <button
        onClick={() => setModalStep('add')}
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000 }}>
        Add Belief
      </button>

      {mode === 'sandbox' && (
        <button
          onClick={handleSuggest}
          style={{ position: 'fixed', top: 10, left: 120, zIndex: 1000 }}>
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

      {modalStep === 'add' && (
        <div style={{ position: 'fixed', top: 100, left: 100, background: 'white', padding: 10, zIndex: 2000 }}>
          <h4>Add Belief</h4>
          <input
            placeholder="Your belief"
            value={modalInput.text}
            onChange={(e) => setModalInput({ ...modalInput, text: e.target.value })}
          />
          <textarea
            placeholder="Notes or justification"
            value={modalInput.notes}
            onChange={(e) => setModalInput({ ...modalInput, notes: e.target.value })}
          />
          <input
            type="range"
            min={0} max={100}
            value={modalInput.confidence}
            onChange={(e) => setModalInput({ ...modalInput, confidence: parseInt(e.target.value) })}
          />
          <button onClick={() => { addBelief(modalInput.text, modalInput.notes, modalInput.confidence); setModalStep(null); }}>Enter</button>
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
