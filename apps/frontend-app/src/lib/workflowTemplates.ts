import { LucideIcon, Mail, Database, FileText, Globe, Calendar, Shield } from 'lucide-react';

export interface WorkflowTemplateStep {
  id: string;
  type: string;
  name: string;
  summary?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  steps: WorkflowTemplateStep[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'email-automation',
    name: 'Email Response Automation',
    description: 'Automatically respond to emails based on content analysis',
    category: 'Communication',
    icon: Mail,
    steps: [
      { id: '1', type: 'trigger', name: 'Email Received', summary: 'Watch an inbox for new messages' },
      { id: '2', type: 'analyze', name: 'Analyze Content', summary: 'Extract sentiment and intent' },
      { id: '3', type: 'action', name: 'Generate Response', summary: 'Draft an AI assisted reply' },
      { id: '4', type: 'action', name: 'Send Reply', summary: 'Deliver response through email' },
    ],
  },
  {
    id: 'data-processing',
    name: 'Data Collection & Processing',
    description: 'Collect data from multiple sources and process it automatically',
    category: 'Data',
    icon: Database,
    steps: [
      { id: '1', type: 'trigger', name: 'Schedule Trigger', summary: 'Run at a defined cadence' },
      { id: '2', type: 'action', name: 'Fetch Data', summary: 'Gather records from APIs' },
      { id: '3', type: 'process', name: 'Clean Data', summary: 'Normalize and deduplicate rows' },
      { id: '4', type: 'action', name: 'Store Results', summary: 'Persist processed dataset' },
    ],
  },
  {
    id: 'content-generation',
    name: 'Content Generation Pipeline',
    description: 'Generate and publish content across multiple platforms',
    category: 'Content',
    icon: FileText,
    steps: [
      { id: '1', type: 'trigger', name: 'Content Request', summary: 'Start from a new brief' },
      { id: '2', type: 'action', name: 'Research Topic', summary: 'Aggregate supporting context' },
      { id: '3', type: 'generate', name: 'Create Content', summary: 'Produce a first draft' },
      { id: '4', type: 'action', name: 'Publish Content', summary: 'Distribute to selected channels' },
    ],
  },
  {
    id: 'web-monitoring',
    name: 'Website Monitoring',
    description: 'Monitor websites for changes and send notifications',
    category: 'Monitoring',
    icon: Globe,
    steps: [
      { id: '1', type: 'trigger', name: 'Schedule Check', summary: 'Poll a site on interval' },
      { id: '2', type: 'action', name: 'Check Website', summary: 'Snapshot page content' },
      { id: '3', type: 'condition', name: 'Detect Changes', summary: 'Compare with previous state' },
      { id: '4', type: 'action', name: 'Send Alert', summary: 'Notify through configured channels' },
    ],
  },
  {
    id: 'meeting-assistant',
    name: 'Meeting Assistant',
    description: 'Automatically schedule meetings and send reminders',
    category: 'Productivity',
    icon: Calendar,
    steps: [
      { id: '1', type: 'trigger', name: 'Meeting Request', summary: 'Ingest scheduling intent' },
      { id: '2', type: 'action', name: 'Check Availability', summary: 'Review calendar slots' },
      { id: '3', type: 'action', name: 'Schedule Meeting', summary: 'Book the confirmed time' },
      { id: '4', type: 'action', name: 'Send Confirmation', summary: 'Share invites and reminders' },
    ],
  },
  {
    id: 'security-monitor',
    name: 'Security Monitoring',
    description: 'Monitor system security and respond to threats',
    category: 'Security',
    icon: Shield,
    steps: [
      { id: '1', type: 'trigger', name: 'Security Event', summary: 'Listen for suspicious events' },
      { id: '2', type: 'analyze', name: 'Threat Analysis', summary: 'Evaluate risk severity' },
      { id: '3', type: 'condition', name: 'Risk Assessment', summary: 'Branch by risk tolerance' },
      { id: '4', type: 'action', name: 'Initiate Response', summary: 'Execute containment plan' },
    ],
  },
];
