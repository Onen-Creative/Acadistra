'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useChat, useCompletion } from 'ai/react'

interface AIContextType {
  generateReport: (studentData: any) => Promise<string>
  analyzePerformance: (marks: any[]) => Promise<string>
  predictRisk: (studentId: string) => Promise<{ risk: 'low' | 'medium' | 'high'; factors: string[] }>
  generateInsights: (classData: any) => Promise<string>
  chatWithAI: (message: string) => Promise<string>
}

const AIContext = createContext<AIContextType>({
  generateReport: async () => '',
  analyzePerformance: async () => '',
  predictRisk: async () => ({ risk: 'low', factors: [] }),
  generateInsights: async () => '',
  chatWithAI: async () => '',
})

export const useAI = () => useContext(AIContext)

interface AIProviderProps {
  children: ReactNode
}

export function AIProvider({ children }: AIProviderProps) {
  const { complete } = useCompletion({
    api: '/api/ai/complete',
  })

  const generateReport = async (studentData: any): Promise<string> => {
    const prompt = `Generate a comprehensive student report for:
    Name: ${studentData.name}
    Class: ${studentData.class}
    Attendance: ${studentData.attendance_rate}%
    Average Grade: ${studentData.average_grade}
    Subjects: ${studentData.subjects?.join(', ')}
    
    Include performance analysis, strengths, areas for improvement, and recommendations.`

    const result = await complete(prompt)
    return result || 'Unable to generate report at this time.'
  }

  const analyzePerformance = async (marks: any[]): Promise<string> => {
    const prompt = `Analyze the following student performance data and provide insights:
    ${JSON.stringify(marks, null, 2)}
    
    Identify trends, patterns, and provide actionable recommendations for teachers and parents.`

    const result = await complete(prompt)
    return result || 'Unable to analyze performance at this time.'
  }

  const predictRisk = async (studentId: string): Promise<{ risk: 'low' | 'medium' | 'high'; factors: string[] }> => {
    // This would integrate with TensorFlow.js model for real prediction
    // For now, returning mock data
    const mockRisks = ['low', 'medium', 'high'] as const
    const mockFactors = [
      'Declining attendance',
      'Poor performance in core subjects',
      'Inconsistent homework submission',
      'Social integration challenges',
      'Family circumstances'
    ]

    return {
      risk: mockRisks[Math.floor(Math.random() * mockRisks.length)],
      factors: mockFactors.slice(0, Math.floor(Math.random() * 3) + 1)
    }
  }

  const generateInsights = async (classData: any): Promise<string> => {
    const prompt = `Analyze this class data and provide teaching insights:
    Class Size: ${classData.size}
    Average Performance: ${classData.average_performance}
    Attendance Rate: ${classData.attendance_rate}%
    Subject Performance: ${JSON.stringify(classData.subject_performance)}
    
    Provide specific recommendations for improving class performance and engagement.`

    const result = await complete(prompt)
    return result || 'Unable to generate insights at this time.'
  }

  const chatWithAI = async (message: string): Promise<string> => {
    const prompt = `You are an AI assistant for a school management system. 
    Help with questions about education, student management, and school operations.
    
    User question: ${message}`

    const result = await complete(prompt)
    return result || 'I apologize, but I cannot process your request at this time.'
  }

  return (
    <AIContext.Provider value={{
      generateReport,
      analyzePerformance,
      predictRisk,
      generateInsights,
      chatWithAI,
    }}>
      {children}
    </AIContext.Provider>
  )
}