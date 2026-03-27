import { useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { PlannedAgent } from '../lib/api';

interface GraphVisualizationProps {
  plannerStatus: "idle" | "running" | "done";
  agents: { agent: PlannedAgent; status: "running" | "done" }[];
  debateStatus: "idle" | "running" | "done";
  checkpointStatus: "none" | "waiting" | "resuming" | "done";
  synthStatus: "idle" | "running" | "done";
}

export function GraphVisualization({
  plannerStatus,
  agents,
  debateStatus,
  checkpointStatus,
  synthStatus
}: GraphVisualizationProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange = (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds));

  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const getStatusClass = (status: string) => {
      if (status === 'running' || status === 'resuming') return 'react-flow__node-active';
      if (status === 'done' || status === 'waiting') return 'react-flow__node-done';
      return '';
    };
    
    // 1. Planner Node
    newNodes.push({
      id: 'planner',
      position: { x: 250, y: 0 },
      data: { label: '🎯 Planner' },
      className: `custom-node ${getStatusClass(plannerStatus)}`
    });

    // 2. Dynamic Agents
    const agentWidth = 150;
    const spacing = 20;
    const totalWidth = agents.length * agentWidth + (agents.length - 1) * spacing;
    const startX = 250 - (totalWidth / 2) + (agentWidth / 2);

    agents.forEach((a, i) => {
      const id = `agent_${i}`;
      newNodes.push({
        id,
        position: { x: startX + i * (agentWidth + spacing), y: 100 },
        data: { label: `${a.agent.icon} ${a.agent.name}` },
        className: `custom-node ${getStatusClass(a.status)}`
      });
      newEdges.push({
        id: `e-planner-${id}`,
        source: 'planner',
        target: id,
        animated: plannerStatus === 'done' && a.status === 'running',
        style: { stroke: '#888' }
      });
    });

    // 3. Debate Node
    if (agents.length > 0) {
      const actualDebateStatus = checkpointStatus === 'waiting' || checkpointStatus === 'done' || checkpointStatus === 'resuming' ? 'done' : debateStatus;
      
      newNodes.push({
        id: 'debate',
        position: { x: 250, y: 200 },
        data: { label: '⚖️ Debate' },
        className: `custom-node ${getStatusClass(actualDebateStatus)}`
      });

      agents.forEach((a, i) => {
        newEdges.push({
          id: `e-agent_${i}-debate`,
          source: `agent_${i}`,
          target: 'debate',
          animated: a.status === 'done' && actualDebateStatus === 'running',
          style: { stroke: '#888' }
        });
      });

      // 4. Synthesizer Node
      newNodes.push({
        id: 'synthesizer',
        position: { x: 250, y: 300 },
        data: { label: '📝 Synthesizer' },
        className: `custom-node ${getStatusClass(synthStatus)}`
      });

      newEdges.push({
        id: 'e-debate-synth',
        source: 'debate',
        target: 'synthesizer',
        animated: (actualDebateStatus === 'done' && synthStatus === 'running') || checkpointStatus === 'resuming',
        style: { stroke: checkpointStatus === 'waiting' ? '#ef4444' : '#888' },
        label: checkpointStatus === 'waiting' ? '⏸️ Checkpoint' : undefined,
        labelStyle: { fill: '#ef4444', fontWeight: 700 }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [plannerStatus, agents, debateStatus, checkpointStatus, synthStatus]);

  if (plannerStatus === 'idle') return null;

  return (
    <div className="graph-container">
      <div className="section-header" style={{ marginBottom: 12, paddingLeft: 16, paddingTop: 16 }}>
        <span className="section-icon">🕸️</span>
        <span className="section-title">Live Execution Graph</span>
      </div>
      <div style={{ width: '100%', height: '400px' }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView 
          minZoom={0.5}
          maxZoom={1.5}
          colorMode="dark"
        >
          <Background color="#333" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
