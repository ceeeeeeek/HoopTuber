"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Eye, Brain, Target } from "lucide-react"

interface CVProcessingDisplayProps {
  stage: string
  progress: number
  estimatedTimeRemaining: number
}

export function CVProcessingDisplay({ stage, progress, estimatedTimeRemaining }: CVProcessingDisplayProps) {
  const getStageIcon = (stage: string) => {
    if (stage.includes("YOLOv6") || stage.includes("detection")) return <Eye className="w-5 h-5" />
    if (stage.includes("GPT-4o") || stage.includes("AI")) return <Brain className="w-5 h-5" />
    if (stage.includes("tracking") || stage.includes("basketball")) return <Target className="w-5 h-5" />
    return <Zap className="w-5 h-5" />
  }

  const getStageColor = (stage: string) => {
    if (stage.includes("YOLOv6")) return "text-orange-500"
    if (stage.includes("GPT-4o")) return "text-blue-500"
    if (stage.includes("tracking")) return "text-green-500"
    return "text-purple-500"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-3">
        <div className={`${getStageColor(stage)} animate-pulse`}>{getStageIcon(stage)}</div>
        <div>
          <h3 className="font-semibold">{stage}</h3>
          <Badge variant="secondary" className="text-xs">
            Real Computer Vision
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>CV Processing</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <div className="text-center text-sm text-gray-500">
        {estimatedTimeRemaining > 0 ? (
          <>
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            {estimatedTimeRemaining} seconds remaining
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Finalizing analysis...
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-orange-50 rounded text-center">
          <div className="font-semibold text-orange-700">YOLOv6</div>
          <div className="text-orange-600">Object Detection</div>
        </div>
        <div className="p-2 bg-blue-50 rounded text-center">
          <div className="font-semibold text-blue-700">GPT-4o</div>
          <div className="text-blue-600">AI Analysis</div>
        </div>
      </div>
    </div>
  )
}
