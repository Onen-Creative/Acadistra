'use client'

interface OrdinaryLevelReportCardProps {
  student: any
  results: any[]
  subjects: any[]
  term: string
  year: string
  examType: string
  school: any
  outstandingBalance: number
  nextTermBegins: string
  nextTermEnds: string
  pageBreak?: boolean
}

export default function OrdinaryLevelReportCard({
  student,
  results,
  subjects,
  term,
  year,
  examType,
  school,
  outstandingBalance,
  nextTermBegins,
  nextTermEnds,
  pageBreak = false
}: OrdinaryLevelReportCardProps) {

  const getGradeComment = (grade: string) => {
    if (grade === 'A') return 'Excellent'
    if (grade === 'B') return 'Very Good'
    if (grade === 'C') return 'Good'
    if (grade === 'D') return 'Fair'
    return 'Needs Improvement'
  }

  const calculateStats = () => {
    if (!results || results.length === 0) return { total: '0', average: '0' }
    let total = 0
    let count = 0
    
    results.forEach((r: any) => {
      const ca = r.raw_marks?.ca || 0
      const exam = r.raw_marks?.exam || 0
      if (ca > 0 || exam > 0) {
        const sbPercent = (ca / 20) * 20
        const extPercent = (exam / 80) * 80
        total += sbPercent + extPercent
        count++
      }
    })
    
    return { total: total.toFixed(1), average: (count > 0 ? total / count : 0).toFixed(1) }
  }

  const stats = calculateStats()

  return (
    <div className={`report-card bg-white mx-auto ${pageBreak ? 'page-break' : ''}`} style={{ width: '210mm', height: '297mm', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', border: '3px solid #000', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ background: 'white', color: '#000', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid #000' }}>
          {school?.logo_url && (
            <img src={school.logo_url.startsWith('http') ? school.logo_url : `http://localhost:8080${school.logo_url}`} alt="Logo" style={{ height: '50px', width: '50px', objectFit: 'contain', background: 'white', borderRadius: '6px', padding: '5px', border: '1px solid #000' }} />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {school?.name}
            </h1>
            <p style={{ fontSize: '8px', margin: '0 0 1px 0', fontStyle: 'italic' }}>
              {school?.motto}
            </p>
            <p style={{ fontSize: '7px', margin: 0 }}>
              {school?.address} • {school?.phone} • {school?.contact_email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'white', color: '#000', padding: '6px 12px', borderRadius: '4px', border: '2px solid #000' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', margin: 0 }}>UCE REPORT</p>
              <p style={{ fontSize: '7px', margin: '1px 0 0 0' }}>{year} • {term}</p>
              <p style={{ fontSize: '6px', margin: '1px 0 0 0', color: '#000' }}>{examType}</p>
            </div>
          </div>
        </div>

        {/* Student Information Bar */}
        <div style={{ background: '#f8fafc', padding: '8px 18px', borderBottom: '3px solid #000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', fontSize: '8px' }}>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Student Name</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '9px', color: '#1e293b' }}>
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Admission No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '8px' }}>{student.admission_no}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '8px' }}>{student.class_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '8px' }}>{student.gender}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '15px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance */}
          <div style={{ marginBottom: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '10px', flex: 1 }}>
              <thead>
                <tr style={{ background: 'white', color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'left', fontWeight: '600' }}>SUBJECT</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '60px' }}>CA (20)</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '60px' }}>EXAM (80)</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>TOTAL</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '45px' }}>GRADE</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '80px' }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject: any, index: number) => {
                  const result = results?.find((r: any) => r.subject_id === subject.id)
                  const ca = result?.raw_marks?.ca || 0
                  const exam = result?.raw_marks?.exam || 0
                  const hasMarks = ca > 0 || exam > 0
                  
                  let grade = ''
                  let totalPercent = 0
                  if (hasMarks) {
                    const sbPercent = (ca / 20) * 20
                    const extPercent = (exam / 80) * 80
                    totalPercent = sbPercent + extPercent
                    
                    if (totalPercent >= 80) grade = 'A'
                    else if (totalPercent >= 65) grade = 'B'
                    else if (totalPercent >= 50) grade = 'C'
                    else if (totalPercent >= 35) grade = 'D'
                    else grade = 'E'
                  }
                  
                  const remark = grade ? getGradeComment(grade) : ''
                  
                  return (
                    <tr key={subject.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #000', padding: '4px', fontWeight: '600', color: '#000' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{ca > 0 ? ca : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{exam > 0 ? exam : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: '700' }}>
                        {hasMarks ? totalPercent.toFixed(0) : ''}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{grade}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '7px', fontStyle: 'italic', color: '#000' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '3px', border: '1px solid #000' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>NCDC Grading Scale</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', fontSize: '7px' }}>
                <span style={{ background: 'white', padding: '3px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>A:</strong> 80-100</span>
                <span style={{ background: 'white', padding: '3px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>B:</strong> 65-79</span>
                <span style={{ background: 'white', padding: '3px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C:</strong> 50-64</span>
                <span style={{ background: 'white', padding: '3px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>D:</strong> 35-49</span>
                <span style={{ background: 'white', padding: '3px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>E:</strong> 0-34</span>
              </div>
              <p style={{ fontSize: '7px', margin: '4px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>CA/20 (20%) + Exam/80 (80%)</p>
            </div>
          </div>

          {/* Summary and Comments Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
            
            {/* Left: Performance Summary */}
            <div>
              <h3 style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 6px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '3px' }}>
                Performance Summary
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '8px', textAlign: 'center', border: '2px solid #000', borderRadius: '3px' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '7px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Total Marks</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000' }}>{stats.total}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px', textAlign: 'center', border: '2px solid #000', borderRadius: '3px' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '7px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Average %</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000' }}>{stats.average}%</p>
              </div>
            </div>

            {/* Right: Comments and Fees */}
            <div>
              <h3 style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 6px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '3px' }}>
                Teacher Comments
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #000', borderRadius: '3px', marginBottom: '8px' }}>
                <p style={{ fontSize: '8px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                <p style={{ fontSize: '8px', margin: '0 0 10px 0', lineHeight: '1.4', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Excellent performance! Keep it up.' :
                   parseFloat(stats.average) >= 65 ? 'Very good work. Well done!' :
                   parseFloat(stats.average) >= 50 ? 'Good effort. Keep improving.' :
                   parseFloat(stats.average) >= 35 ? 'Fair performance. More effort needed.' :
                   'Poor performance. Needs improvement.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '6px', margin: '0 0 2px 0', color: '#000' }}>Name</p>
                    <p style={{ fontSize: '7px', margin: 0, fontWeight: '600' }}>__________</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '6px', margin: '0 0 2px 0', color: '#000' }}>Sign</p>
                    <p style={{ fontSize: '7px', margin: 0, fontWeight: '600' }}>__________</p>
                  </div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #000', borderRadius: '3px', marginBottom: '8px' }}>
                <p style={{ fontSize: '8px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                <p style={{ fontSize: '8px', margin: '0 0 10px 0', lineHeight: '1.4', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Outstanding achievement!' :
                   parseFloat(stats.average) >= 65 ? 'Commendable performance!' :
                   parseFloat(stats.average) >= 50 ? 'Satisfactory progress.' :
                   parseFloat(stats.average) >= 35 ? 'Requires more dedication.' :
                   'Immediate intervention required.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '6px', margin: '0 0 2px 0', color: '#000' }}>Name</p>
                    <p style={{ fontSize: '7px', margin: 0, fontWeight: '600' }}>__________</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '6px', margin: '0 0 2px 0', color: '#000' }}>Sign & Stamp</p>
                    <p style={{ fontSize: '7px', margin: 0, fontWeight: '600' }}>__________</p>
                  </div>
                </div>
              </div>

              {/* Fees */}
              <div style={{ background: '#f8fafc', padding: '8px', border: '2px solid #000', borderRadius: '3px' }}>
                <p style={{ fontSize: '8px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000' }}>Fees Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', color: '#000' }}>Outstanding:</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#000' }}>
                    UGX {outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                {outstandingBalance > 0 && (
                  <p style={{ fontSize: '6px', margin: '4px 0 0 0', color: '#000', fontStyle: 'italic' }}>
                    Please clear outstanding fees.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #000', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px' }}>
              <div>
                <p style={{ margin: '0 0 1px 0', fontWeight: '700', color: '#000' }}>Next Term Dates</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opens:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '___________'} • 
                  <strong> Closes:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '___________'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '6px', fontStyle: 'italic', color: '#000' }}>
                  Official document. Alteration prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'white', color: '#000', padding: '8px 20px', textAlign: 'center', fontSize: '7px', borderTop: '2px solid #000' }}>
          <p style={{ margin: 0 }}>
            © {year} {school?.name} • Empowering Excellence in Education
          </p>
        </div>
      </div>
    </div>
  )
}
