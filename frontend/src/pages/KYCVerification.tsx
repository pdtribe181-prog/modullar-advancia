import React, { useState, CSSProperties, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

type Step = 1 | 2 | 3 | 4;

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '700px',
  margin: '0 auto',
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '40px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
};

const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '8px',
};

const subtitleStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.6)',
};

const stepsContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '40px',
};

const stepStyle = (active: boolean, completed: boolean): CSSProperties => ({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 700,
  background: completed ? 'rgba(16, 185, 129, 0.2)' : active ? 'rgba(96, 128, 245, 0.2)' : 'rgba(255,255,255,0.05)',
  color: completed ? '#10b981' : active ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
  border: completed ? '2px solid #10b981' : active ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
  transition: 'all 0.3s',
});

const stepConnectorStyle = (active: boolean): CSSProperties => ({
  width: '40px',
  height: '2px',
  background: active ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
  alignSelf: 'center',
});

const sectionTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '8px',
};

const sectionDescStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  marginBottom: '24px',
};

const fieldStyle: CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '8px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
};

const uploadBoxStyle = (isDragOver: boolean, hasFile: boolean): CSSProperties => ({
  border: `2px dashed ${isDragOver ? 'var(--primary)' : hasFile ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: '12px',
  padding: '32px 24px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  background: isDragOver ? 'rgba(96, 128, 245, 0.05)' : hasFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
});

const uploadIconStyle: CSSProperties = {
  fontSize: '40px',
  marginBottom: '12px',
};

const uploadTextStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '8px',
};

const uploadHintStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.4)',
};

const previewBoxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'rgba(16, 185, 129, 0.1)',
  borderRadius: '10px',
  marginTop: '12px',
};

const previewTextStyle: CSSProperties = {
  flex: 1,
  fontSize: '14px',
  color: '#10b981',
  fontWeight: 500,
};

const removeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: '18px',
};

const btnStyle: CSSProperties = {
  width: '100%',
  padding: '16px 24px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
};

const btnSecondaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '24px',
};

const docTypeStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  padding: '20px',
  borderRadius: '12px',
  border: `2px solid ${selected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
  background: selected ? 'rgba(96, 128, 245, 0.1)' : 'transparent',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const docTypeIconStyle: CSSProperties = {
  fontSize: '32px',
  marginBottom: '8px',
};

const docTypeLabelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#ffffff',
};

const infoBoxStyle: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: '10px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const infoTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#3b82f6',
  lineHeight: 1.6,
};

const successBoxStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px',
};

const successIconStyle: CSSProperties = {
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  background: 'rgba(16, 185, 129, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  margin: '0 auto 24px',
};

const checklistStyle: CSSProperties = {
  textAlign: 'left',
  marginBottom: '24px',
};

const checklistItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const checkIconStyle = (checked: boolean): CSSProperties => ({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: checked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  color: checked ? '#10b981' : 'rgba(255,255,255,0.3)',
});

const checkTextStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.7)',
};

export const KYCVerification: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const [docType, setDocType] = useState<'passport' | 'drivers_license' | 'national_id'>('passport');
  const [documents, setDocuments] = useState<{
    front: File | null;
    back: File | null;
    selfie: File | null;
  }>({
    front: null,
    back: null,
    selfie: null,
  });

  const handleFileSelect = (type: 'front' | 'back' | 'selfie', file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const handleDrop = (type: 'front' | 'back' | 'selfie', e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileSelect(type, file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep(4);
    } catch (error) {
      console.error('KYC submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>Identity Verification</h1>
            <p style={subtitleStyle}>Complete KYC to unlock higher withdrawal limits</p>
          </div>

          {/* Progress Steps */}
          <div style={stepsContainerStyle}>
            <div style={stepStyle(step === 1, step > 1)}>{step > 1 ? '✓' : '1'}</div>
            <div style={stepConnectorStyle(step > 1)} />
            <div style={stepStyle(step === 2, step > 2)}>{step > 2 ? '✓' : '2'}</div>
            <div style={stepConnectorStyle(step > 2)} />
            <div style={stepStyle(step === 3, step > 3)}>{step > 3 ? '✓' : '3'}</div>
            <div style={stepConnectorStyle(step > 3)} />
            <div style={stepStyle(step === 4, false)}>4</div>
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <>
              <h2 style={sectionTitleStyle}>Personal Information</h2>
              <p style={sectionDescStyle}>Enter your legal name as it appears on your ID</p>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={e => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                    placeholder="John"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    type="text"
                    value={personalInfo.lastName}
                    onChange={e => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Date of Birth *</label>
                  <input
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={e => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Nationality *</label>
                  <select
                    value={personalInfo.nationality}
                    onChange={e => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                    style={selectStyle}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Street Address *</label>
                <input
                  type="text"
                  value={personalInfo.address}
                  onChange={e => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  placeholder="123 Main Street, Apt 4"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    value={personalInfo.city}
                    onChange={e => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                    placeholder="San Francisco"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>State/Province *</label>
                  <input
                    type="text"
                    value={personalInfo.state}
                    onChange={e => setPersonalInfo({ ...personalInfo, state: e.target.value })}
                    placeholder="California"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Postal Code *</label>
                  <input
                    type="text"
                    value={personalInfo.postalCode}
                    onChange={e => setPersonalInfo({ ...personalInfo, postalCode: e.target.value })}
                    placeholder="94102"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Country *</label>
                  <select
                    value={personalInfo.country}
                    onChange={e => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                    style={selectStyle}
                    required
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <button style={btnPrimaryStyle} onClick={() => setStep(2)}>
                Continue →
              </button>
            </>
          )}

          {/* Step 2: Document Type */}
          {step === 2 && (
            <>
              <h2 style={sectionTitleStyle}>Select Document Type</h2>
              <p style={sectionDescStyle}>Choose the ID document you'll use for verification</p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div style={docTypeStyle(docType === 'passport')} onClick={() => setDocType('passport')}>
                  <div style={docTypeIconStyle}>🛂</div>
                  <div style={docTypeLabelStyle}>Passport</div>
                </div>
                <div style={docTypeStyle(docType === 'drivers_license')} onClick={() => setDocType('drivers_license')}>
                  <div style={docTypeIconStyle}>🚗</div>
                  <div style={docTypeLabelStyle}>Driver's License</div>
                </div>
                <div style={docTypeStyle(docType === 'national_id')} onClick={() => setDocType('national_id')}>
                  <div style={docTypeIconStyle}>🪪</div>
                  <div style={docTypeLabelStyle}>National ID</div>
                </div>
              </div>

              <div style={infoBoxStyle}>
                <p style={infoTextStyle}>
                  ℹ️ Your document must be valid (not expired) and clearly readable.
                  All four corners must be visible in the photo.
                </p>
              </div>

              <div style={actionsStyle}>
                <button style={btnSecondaryStyle} onClick={() => setStep(1)}>← Back</button>
                <button style={btnPrimaryStyle} onClick={() => setStep(3)}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 3: Upload Documents */}
          {step === 3 && (
            <>
              <h2 style={sectionTitleStyle}>Upload Documents</h2>
              <p style={sectionDescStyle}>Upload clear photos of your {docType.replace('_', ' ')}</p>

              {/* Front of ID */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Front of {docType.replace('_', ' ')} *</label>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect('front', e.target.files?.[0] || null)}
                />
                <div
                  style={uploadBoxStyle(dragOver === 'front', !!documents.front)}
                  onClick={() => frontInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver('front'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop('front', e)}
                >
                  <div style={uploadIconStyle}>{documents.front ? '✅' : '📄'}</div>
                  <div style={uploadTextStyle}>
                    {documents.front ? documents.front.name : 'Click to upload or drag & drop'}
                  </div>
                  <div style={uploadHintStyle}>JPG, PNG or PDF • Max 10MB</div>
                </div>
                {documents.front && (
                  <div style={previewBoxStyle}>
                    <span style={previewTextStyle}>{documents.front.name}</span>
                    <button style={removeBtnStyle} onClick={() => handleFileSelect('front', null)}>✕</button>
                  </div>
                )}
              </div>

              {/* Back of ID (not for passport) */}
              {docType !== 'passport' && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Back of {docType.replace('_', ' ')} *</label>
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={e => handleFileSelect('back', e.target.files?.[0] || null)}
                  />
                  <div
                    style={uploadBoxStyle(dragOver === 'back', !!documents.back)}
                    onClick={() => backInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver('back'); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop('back', e)}
                  >
                    <div style={uploadIconStyle}>{documents.back ? '✅' : '📄'}</div>
                    <div style={uploadTextStyle}>
                      {documents.back ? documents.back.name : 'Click to upload or drag & drop'}
                    </div>
                    <div style={uploadHintStyle}>JPG, PNG or PDF • Max 10MB</div>
                  </div>
                </div>
              )}

              {/* Selfie */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Selfie with ID *</label>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect('selfie', e.target.files?.[0] || null)}
                />
                <div
                  style={uploadBoxStyle(dragOver === 'selfie', !!documents.selfie)}
                  onClick={() => selfieInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver('selfie'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop('selfie', e)}
                >
                  <div style={uploadIconStyle}>{documents.selfie ? '✅' : '🤳'}</div>
                  <div style={uploadTextStyle}>
                    {documents.selfie ? documents.selfie.name : 'Take a selfie holding your ID'}
                  </div>
                  <div style={uploadHintStyle}>Face and ID must be clearly visible</div>
                </div>
              </div>

              <div style={actionsStyle}>
                <button style={btnSecondaryStyle} onClick={() => setStep(2)}>← Back</button>
                <button
                  style={{
                    ...btnPrimaryStyle,
                    opacity: !documents.front || !documents.selfie || loading ? 0.6 : 1,
                  }}
                  onClick={handleSubmit}
                  disabled={!documents.front || !documents.selfie || loading}
                >
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div style={successBoxStyle}>
              <div style={successIconStyle}>📋</div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: '16px' }}>Verification Submitted!</h2>
              <p style={{ ...sectionDescStyle, marginBottom: '32px' }}>
                Your documents are being reviewed. This usually takes 1-3 business days.
              </p>

              <div style={checklistStyle}>
                <div style={checklistItemStyle}>
                  <div style={checkIconStyle(true)}>✓</div>
                  <span style={checkTextStyle}>Personal information submitted</span>
                </div>
                <div style={checklistItemStyle}>
                  <div style={checkIconStyle(true)}>✓</div>
                  <span style={checkTextStyle}>Identity document uploaded</span>
                </div>
                <div style={checklistItemStyle}>
                  <div style={checkIconStyle(true)}>✓</div>
                  <span style={checkTextStyle}>Selfie verification uploaded</span>
                </div>
                <div style={checklistItemStyle}>
                  <div style={checkIconStyle(false)}>⏳</div>
                  <span style={checkTextStyle}>Under review</span>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                We'll send you an email notification once your verification is complete.
              </p>

              <button style={btnPrimaryStyle} onClick={() => navigate('/profile')}>
                Return to Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCVerification;
