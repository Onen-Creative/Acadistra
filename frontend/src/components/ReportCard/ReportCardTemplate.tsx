'use client'

import React from 'react'

interface ReportCardProps {
  student: any
  school: any
  results: any[]
  term: string
  year: string
  level: string
  className: string
  examType: string
  outstandingBalance: number
  nextTermBegins: string
  nextTermEnds: string
}

export const ReportCardTemplate: React.FC<ReportCardProps> = ({
  student,
  school,
  results,
  term,
  year,
  level,
  className,
  examType,
  outstandingBalance,
  nextTermBegins,
  nextTermEnds
}) => {
  const isNursery = ['Baby', 'Middle', 'Top', 'Nursery'].includes(level)
  const isPrimaryLower = ['P1', 'P2', 'P3'].includes(level)
  const isPrimaryUpper = ['P4', 'P5', 'P6', 'P7'].includes(level)
  const isOrdinary = ['S1', 'S2', 'S3', 'S4'].includes(level)
  const isAdvanced = ['S5', 'S6'].includes(level)

  const calculateStats = () => {
    const resultsWithMarks = results.filter(r => r.raw_marks?.total)
    const totals = resultsWithMarks.map(r => r.raw_marks?.total || 0)
    const sum = totals.reduce((a, b) => a + b, 0)
    const avg = totals.length > 0 ? sum / totals.length : 0
    return { totalMarks: sum, average: avg.toFixed(1), subjects: resultsWithMarks.length, avgNum: avg }
  }

  const getTeacherComment = (average: number) => {
    if (average >= 80) return 'Excellent performance! Keep up the outstanding work.'
    if (average >= 70) return 'Very good work. Continue with the same effort.'
    if (average >= 60) return 'Good performance. Keep improving.'
    if (average >= 50) return 'Satisfactory work. More effort needed.'
    if (average >= 40) return 'Fair performance. Needs to work harder.'
    return 'Weak performance. Requires serious attention and extra support.'
  }

  const getHeadTeacherComment = (average: number) => {
    if (average >= 80) return 'Outstanding achievement. A role model for others.'
    if (average >= 70) return 'Commendable performance. Well done.'
    if (average >= 60) return 'Good progress. Keep up the good work.'
    if (average >= 50) return 'Satisfactory. Encouraged to aim higher.'
    if (average >= 40) return 'Needs improvement. Parent support required.'
    return 'Serious intervention needed. Parent conference recommended.'
  }

  const stats = calculateStats()

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB')
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
          }
          body * {
            visibility: hidden;
          }
          .report-card-container,
          .report-card-container * {
            visibility: visible;
          }
          .report-card-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
      
      <div className="report-card-container" style={{ 
        width: '210mm',
        height: '297mm',
        margin: '0 auto',
        padding: '10mm',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}>
        <div style={{
          border: '3px solid #1e40af',
          padding: '8mm',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
        {/* Header */}
        <div style={{ borderBottom: '3px solid #1e40af', paddingBottom: '6px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            {/* School Logo */}
            <div style={{ width: '60px', height: '60px', flexShrink: 0, border: '2px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {school?.logo_url ? (
                <img src={school.logo_url.startsWith('http') ? school.logo_url : `http://localhost:8080${school.logo_url}`} alt="School Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '8px', color: '#9ca3af', textAlign: 'center' }}>School Logo</span>
              )}
            </div>
            
            {/* School Details */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '2px' }}>
                {school?.name || 'Tanna Memorial High School'}
              </h1>
              <p style={{ fontSize: '9px', color: '#4b5563', margin: '1px 0', fontStyle: 'italic' }}>
                "{school?.motto || 'Excellence in Education'}"
              </p>
              <p style={{ fontSize: '10px', color: '#4b5563', margin: '1px 0' }}>{school?.address || 'Tororo, Uganda'}</p>
              <p style={{ fontSize: '10px', color: '#4b5563', margin: '1px 0' }}>
                Tel: {school?.phone || '+256700000000'} | Email: {school?.contact_email || 'info@acadistra.com'}
              </p>
              <div style={{ 
                marginTop: '6px', 
                backgroundColor: '#eff6ff', 
                padding: '6px 12px', 
                display: 'inline-block',
                borderRadius: '4px'
              }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                  STUDENT REPORT CARD
                </h2>
              </div>
            </div>
            
            {/* Student Photo */}
            <div style={{ width: '60px', height: '60px', flexShrink: 0, border: '2px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {student?.photo_url ? (
                <img src={student.photo_url.startsWith('http') ? student.photo_url : `http://localhost:8080${student.photo_url}`} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                    {student?.first_name?.[0]}{student?.last_name?.[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          marginBottom: '8px',
          backgroundColor: '#f9fafb',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb'
        }}>
          <div>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Student Name:</span> {student?.first_name} {student?.last_name}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Admission No:</span> {student?.admission_number}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Class:</span> {className}
            </p>
          </div>
          <div>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Term:</span> {term}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Year:</span> {year}
            </p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>
              <span style={{ fontWeight: '600' }}>Exam Type:</span> {examType}
            </p>
          </div>
        </div>

        {/* Academic Performance */}
        <div style={{ marginBottom: '6px', flex: 1 }}>
          <h3 style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: '#1e3a8a', 
            marginBottom: '6px',
            borderBottom: '2px solid #93c5fd',
            paddingBottom: '3px',
            textAlign: 'center'
          }}>
            ACADEMIC PERFORMANCE
          </h3>
          
          {isNursery && <NurseryTable results={results} />}
          {isPrimaryLower && <PrimaryLowerTable results={results} />}
          {isPrimaryUpper && <PrimaryUpperTable results={results} />}
          {isOrdinary && <OrdinaryTable results={results} />}
          {isAdvanced && <AdvancedTable results={results} />}
        </div>

        {/* Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '6px', 
          marginBottom: '6px',
          backgroundColor: '#eff6ff',
          padding: '6px',
          borderRadius: '4px',
          border: '1px solid #93c5fd'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '8px', color: '#4b5563', margin: '0 0 2px 0' }}>Total Subjects</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{stats.subjects}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '8px', color: '#4b5563', margin: '0 0 2px 0' }}>Total Marks</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{stats.totalMarks.toFixed(1)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '8px', color: '#4b5563', margin: '0 0 2px 0' }}>Average</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{stats.average}%</p>
          </div>
        </div>

        {/* Grading Key */}
        <div style={{ marginBottom: '6px' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', textAlign: 'center' }}>GRADING SCALE</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <table style={{ borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
              <tbody>
                {isNursery && (
                  <tr>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>Mastering: 80-100</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>Secure: 65-79</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>Developing: 50-64</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>Emerging: 35-49</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>Not Yet: 0-34</td>
                  </tr>
                )}
                {(isPrimaryLower || isPrimaryUpper) && (
                  <tr>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>D1: 80-100</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>D2: 70-79</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>C3: 65-69</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>C4: 60-64</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>C5: 55-59</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>C6: 50-54</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>P7: 45-49</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>P8: 40-44</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>F9: 0-39</td>
                  </tr>
                )}
                {isOrdinary && (
                  <tr>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '9px', textAlign: 'center' }}>A: 80-100</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '9px', textAlign: 'center' }}>B: 65-79</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '9px', textAlign: 'center' }}>C: 50-64</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '9px', textAlign: 'center' }}>D: 35-49</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '9px', textAlign: 'center' }}>E: 0-34</td>
                  </tr>
                )}
                {isAdvanced && (
                  <tr>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>A: 75-100</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>B: 65-74</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>C: 55-64</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>D: 45-54</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>E: 40-44</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>O: 35-39</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '4px 8px', fontSize: '9px', textAlign: 'center' }}>F: 0-34</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teacher Comments */}
        <div style={{ marginBottom: '6px' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>TEACHER'S COMMENTS</h3>
          <div style={{ fontSize: '9px', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 4px 0' }}><span style={{ fontWeight: '600' }}>Class Teacher:</span> {getTeacherComment(stats.avgNum)}</p>
            <p style={{ margin: 0 }}><span style={{ fontWeight: '600' }}>Head Teacher:</span> {getHeadTeacherComment(stats.avgNum)}</p>
          </div>
        </div>

        {/* Financial & Term Info */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '6px', 
          marginBottom: '6px',
          fontSize: '9px'
        }}>
          <div style={{ backgroundColor: '#fef3c7', padding: '6px', borderRadius: '4px', border: '1px solid #fbbf24', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Outstanding Balance:</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>UGX {outstandingBalance.toLocaleString()}</p>
          </div>
          <div style={{ backgroundColor: '#dbeafe', padding: '6px', borderRadius: '4px', border: '1px solid #60a5fa', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Next Term Begins:</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>{formatDate(nextTermBegins)}</p>
          </div>
          <div style={{ backgroundColor: '#dbeafe', padding: '6px', borderRadius: '4px', border: '1px solid #60a5fa', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>Next Term Ends:</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>{formatDate(nextTermEnds)}</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          paddingTop: '8px',
          borderTop: '2px solid #d1d5db',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '9px', color: '#6b7280', margin: 0 }}>Generated on {new Date().toLocaleDateString()}</p>
        </div>
        </div>
      </div>
    </>
  )
}

const tableStyle = {
  width: '100%',
  fontSize: '11px',
  borderCollapse: 'collapse' as const,
  marginBottom: '2px'
}

const thStyle = {
  border: '1px solid #d1d5db',
  padding: '5px',
  backgroundColor: '#dbeafe',
  fontWeight: '600' as const,
  fontSize: '10px'
}

const tdStyle = {
  border: '1px solid #d1d5db',
  padding: '5px',
  fontSize: '11px'
}

const getSubjectRemark = (total: number) => {
  if (total >= 80) return 'Excellent'
  if (total >= 70) return 'Very Good'
  if (total >= 60) return 'Good'
  if (total >= 50) return 'Satisfactory'
  if (total >= 40) return 'Fair'
  return 'Weak'
}

const NurseryTable: React.FC<{ results: any[] }> = ({ results }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={{ ...thStyle, textAlign: 'left' }}>Learning Domain</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>CA (40)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Exam (60)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Total (100)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Descriptor</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Remark</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, idx) => {
        const marks = result.raw_marks || {}
        const hasMarks = marks.ca || marks.exam
        const total = marks.total || 0
        return (
          <tr key={idx}>
            <td style={tdStyle}>{result.subject_name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.ca || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.exam || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{hasMarks ? total.toFixed(1) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{result.final_grade || ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '7px' }}>{hasMarks ? getSubjectRemark(total) : ''}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)

const PrimaryLowerTable: React.FC<{ results: any[] }> = ({ results }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={{ ...thStyle, textAlign: 'left' }}>Subject</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>CA (40)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>Exam (60)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>Total (100)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>Grade</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '55px' }}>Remark</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, idx) => {
        const marks = result.raw_marks || {}
        const hasMarks = marks.ca || marks.exam
        const total = marks.total || 0
        return (
          <tr key={idx}>
            <td style={tdStyle}>{result.subject_name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.ca || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.exam || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{hasMarks ? total.toFixed(1) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', color: '#1e3a8a' }}>{result.final_grade || ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '7px' }}>{hasMarks ? getSubjectRemark(total) : ''}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)

const PrimaryUpperTable: React.FC<{ results: any[] }> = ({ results }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={{ ...thStyle, textAlign: 'left' }}>Subject</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '38px' }}>CA (40)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '38px' }}>Exam (60)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '38px' }}>Total (100)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '38px' }}>Grade</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '38px' }}>Points</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '50px' }}>Remark</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, idx) => {
        const marks = result.raw_marks || {}
        const hasMarks = marks.ca || marks.exam
        const total = marks.total || 0
        const gradePoints: any = { D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, P8: 8, F9: 9 }
        return (
          <tr key={idx}>
            <td style={tdStyle}>{result.subject_name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.ca || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.exam || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{hasMarks ? total.toFixed(1) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', color: '#1e3a8a' }}>{result.final_grade || ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{result.final_grade ? (gradePoints[result.final_grade] || '') : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '7px' }}>{hasMarks ? getSubjectRemark(total) : ''}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)

const OrdinaryTable: React.FC<{ results: any[] }> = ({ results }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={{ ...thStyle, textAlign: 'left', fontSize: '11px' }}>Subject</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '60px', fontSize: '10px' }}>CA (20)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '60px', fontSize: '10px' }}>Exam (80)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '60px', fontSize: '10px' }}>Total (100)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '50px', fontSize: '10px' }}>Grade</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '70px', fontSize: '10px' }}>Remark</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, idx) => {
        const marks = result.raw_marks || {}
        const hasMarks = marks.ca || marks.exam
        const total = marks.total || 0
        return (
          <tr key={idx}>
            <td style={{ ...tdStyle, fontSize: '11px' }}>{result.subject_name}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{hasMarks ? (marks.ca || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px' }}>{hasMarks ? (marks.exam || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>{hasMarks ? total.toFixed(1) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#1e3a8a' }}>{result.final_grade || ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '10px' }}>{hasMarks ? getSubjectRemark(total) : ''}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)

const AdvancedTable: React.FC<{ results: any[] }> = ({ results }) => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={{ ...thStyle, textAlign: 'left' }}>Subject</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>CA (40)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Exam (60)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Total (100)</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Grade</th>
        <th style={{ ...thStyle, textAlign: 'center', width: '55px' }}>Remark</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, idx) => {
        const marks = result.raw_marks || {}
        const hasMarks = marks.ca || marks.exam
        const total = marks.total || 0
        return (
          <tr key={idx}>
            <td style={tdStyle}>{result.subject_name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.ca || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{hasMarks ? (marks.exam || 0) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{hasMarks ? total.toFixed(1) : ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', fontSize: '9px', color: '#1e3a8a' }}>{result.final_grade || ''}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '7px' }}>{hasMarks ? getSubjectRemark(total) : ''}</td>
          </tr>
        )
      })}
    </tbody>
  </table>
)
