export type DocumentCategory =
  | 'Programme Information'
  | 'Syllabus'
  | 'Semester Materials'
  | 'Course Materials'
  | 'Lecture Notes'
  | 'Practical Work'
  | 'Projects'
  | 'Examination and Assessment'
  | 'Official Notices'
  | 'Other Approved Academic Documents';

export type DocumentApprovalStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Needs review'
  | 'Approved'
  | 'Rejected'
  | 'Archived';

export interface DocumentMetadata {
  id: string;
  originalFilename: string;
  title: string;
  category: DocumentCategory;
  subject?: string;
  semester?: string;
  academicYear?: string;
  sourceType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'md';
  verificationStatus: DocumentApprovalStatus;
  uploadDate: string;
  version: string;
  pageCount: number;
  extractionStatus: 'success' | 'warning' | 'failed';
  summary?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  subject?: string;
  semester?: string;
  page: number;
  heading: string;
  text: string;
  tokenCountEstimate: number;
}

export interface Citation {
  documentTitle: string;
  page?: number;
  section?: string;
  sourceId: string;
  snippet?: string;
  category?: string;
}

export type AnswerStyle =
  | 'simple'
  | 'detailed'
  | 'exam'
  | 'quick'
  | 'step-by-step'
  | 'comparison';

export type ScopeClassification =
  | 'IN_SCOPE'
  | 'OUT_OF_SCOPE'
  | 'IN_SCOPE_BUT_INSUFFICIENT_SOURCES';

export type ChatResponseStatus =
  | 'answered'
  | 'out_of_scope'
  | 'insufficient_sources'
  | 'temporarily_unavailable'
  | 'error';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: ChatResponseStatus;
  scope?: ScopeClassification;
  citations?: Citation[];
  grounded?: boolean;
  provider?: string;
  answerStyle?: AnswerStyle;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  currentStyle: AnswerStyle;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  history?: Array<{
    sender: 'user' | 'assistant';
    content: string;
  }>;
  answerStyle?: AnswerStyle;
}

export interface ChatResponse {
  status: ChatResponseStatus;
  scope?: ScopeClassification;
  answer: string;
  citations: Citation[];
  provider: string;
  grounded: boolean;
  error?: string;
  diagnostic?: any;
}
