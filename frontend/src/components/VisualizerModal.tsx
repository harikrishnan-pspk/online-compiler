import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Code2,
  Table,
  Layers,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { VisualizerResponse, VisualStep } from '../types';

interface VisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualData: VisualizerResponse | null;
  isLoading: boolean;
  currentCode: string;
}

export const VisualizerModal: React.FC<VisualizerModalProps> = ({
  isOpen,
  onClose,
  visualData,
  isLoading,
  currentCode
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [visualData]);

  // Autoplay step timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && visualData && currentStepIdx < visualData.steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIdx(prev => prev + 1);
      }, 1200);
    } else if (currentStepIdx >= (visualData?.steps.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, visualData]);

  if (!isOpen) return null;

  const steps = visualData?.steps || [];
  const currentStep: VisualStep | undefined = steps[currentStepIdx];

  const codeLines = currentCode.split('\n');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-[#f0f6fc]">
        {/* Modal Top Bar */}
        <div className="h-12 px-4 border-b border-[#30363d] bg-[#0b0e14] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Visual Code Execution</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                  Step-by-Step Tracer
                </span>
              </div>
            </div>
          </div>

          {/* Player Controls in Header */}
          {steps.length > 0 && (
            <div className="flex items-center space-x-2 bg-[#161b22] px-3 py-1 rounded-lg border border-[#30363d]">
              <button
                onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                disabled={currentStepIdx === 0}
                className="p-1 rounded text-[#8b949e] hover:text-white disabled:opacity-30"
                title="Previous step"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center space-x-1"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={currentStepIdx >= steps.length - 1}
                className="p-1 rounded text-[#8b949e] hover:text-white disabled:opacity-30"
                title="Next step"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-[#8b949e] font-mono pl-2 border-l border-[#30363d]">
                Step {currentStepIdx + 1} / {steps.length}
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-xs text-[#8b949e]">Analyzing AST and execution states...</span>
          </div>
        ) : !currentStep ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#6e7681]">
            No execution steps available.
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Code with Line Highlight */}
            <div className="w-full md:w-1/2 border-r border-[#30363d] bg-[#0d1117] flex flex-col">
              <div className="px-3 py-2 border-b border-[#30363d] text-xs font-semibold text-[#8b949e] flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Source Code</span>
              </div>
              <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-0.5">
                {codeLines.map((line, idx) => {
                  const lineNum = idx + 1;
                  const isCurrent = lineNum === currentStep.line_number;
                  return (
                    <div
                      key={idx}
                      className={`px-2 py-0.5 rounded flex items-center space-x-3 transition-colors ${
                        isCurrent
                          ? 'bg-purple-600/30 text-purple-200 border-l-2 border-purple-400 font-semibold'
                          : 'text-[#8b949e] hover:bg-[#161b22]'
                      }`}
                    >
                      <span className="w-6 text-right text-[11px] text-[#484f58] select-none flex-shrink-0">
                        {lineNum}
                      </span>
                      <pre className="whitespace-pre overflow-x-auto flex-1">{line || ' '}</pre>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: State Inspector (Variables, Arrays, Linked Lists) */}
            <div className="w-full md:w-1/2 bg-[#161b22] flex flex-col overflow-y-auto p-4 space-y-4">
              {/* Step Description Card */}
              <div className="p-3 bg-[#21262d] border border-purple-500/30 rounded-lg">
                <div className="text-[11px] uppercase font-bold text-purple-400 mb-1">
                  Step {currentStep.step_number}: Line {currentStep.line_number}
                </div>
                <div className="text-xs text-white font-medium mb-1">{currentStep.description}</div>
                <code className="text-[11px] font-mono text-cyan-300 bg-[#0b0e14] px-2 py-1 rounded block truncate">
                  {currentStep.code_line}
                </code>
              </div>

              {/* Variables Table */}
              <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3">
                <div className="text-xs font-bold text-[#8b949e] mb-2 flex items-center space-x-1.5">
                  <Table className="w-3.5 h-3.5 text-blue-400" />
                  <span>Variable States</span>
                </div>
                {Object.keys(currentStep.variables).length === 0 ? (
                  <div className="text-xs text-[#6e7681] italic">No active stack variables yet.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(currentStep.variables).map(([key, val]) => (
                      <div
                        key={key}
                        className="bg-[#161b22] border border-[#30363d] p-2 rounded flex justify-between items-center text-xs"
                      >
                        <span className="font-mono text-cyan-300 font-bold">{key}</span>
                        <span className="font-mono text-emerald-400 bg-black/40 px-2 py-0.5 rounded font-semibold">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Array Visualizer */}
              {Object.keys(currentStep.arrays).length > 0 && (
                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3">
                  <div className="text-xs font-bold text-[#8b949e] mb-2 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Array Memory Visualizer</span>
                  </div>
                  {Object.entries(currentStep.arrays).map(([name, elements]) => (
                    <div key={name} className="mb-3 last:mb-0">
                      <div className="text-[11px] font-mono text-amber-300 mb-1">{name}[]</div>
                      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                        {elements.map((val, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center bg-[#161b22] border border-amber-500/40 rounded p-1.5 min-w-[44px]"
                          >
                            <span className="text-[10px] text-[#6e7681] select-none font-mono">[{idx}]</span>
                            <span className="font-mono font-bold text-xs text-amber-200 mt-0.5">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Linked List Visualizer */}
              {Object.keys(currentStep.linked_lists).length > 0 && (
                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3">
                  <div className="text-xs font-bold text-[#8b949e] mb-2 flex items-center space-x-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Linked List Visualizer</span>
                  </div>
                  {Object.entries(currentStep.linked_lists).map(([name, nodes]) => (
                    <div key={name} className="flex items-center space-x-1 overflow-x-auto py-1">
                      {nodes.map((val, idx) => (
                        <React.Fragment key={idx}>
                          <div className="bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-md font-mono text-xs text-emerald-300 font-bold shadow-sm">
                            [{val}]
                          </div>
                          <span className="text-emerald-500 font-bold select-none">→</span>
                        </React.Fragment>
                      ))}
                      <div className="bg-black/50 border border-dashed border-[#6e7681] px-2 py-1.5 rounded text-[11px] text-[#8b949e] font-mono">
                        NULL
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Output Stream */}
              {currentStep.output && (
                <div className="bg-[#0b0e14] border border-[#30363d] rounded-lg p-3">
                  <div className="text-xs font-bold text-[#8b949e] mb-1">Standard Output (stdout)</div>
                  <pre className="font-mono text-xs text-[#f0f6fc] whitespace-pre-wrap">{currentStep.output}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
