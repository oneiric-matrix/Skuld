import { agentBus } from '../kernel/AgentBusService';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IdeaStatus = 'captured' | 'exploring' | 'converted' | 'archived';
export type ProjectStatus = 'planning' | 'in_progress' | 'blocked' | 'completed' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface IdeaItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: IdeaStatus;
  convertedProjectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate: number;
  isCompleted: boolean;
}

export interface ProjectItem {
  id: string;
  ideaId?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  milestones: Milestone[];
  deadline?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  deadline?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  project: ProjectItem;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progressPercentage: number;
}

/**
 * Project Manager Domain Service.
 * Manages idea capture/backlog, milestone breakdown, and task lifecycle tracking.
 * Communicates with peer agents (e.g. Butler) via the central AgentBus.
 */
export class ProjectManagerService {
  private static instance: ProjectManagerService | null = null;
  private ideas = new Map<string, IdeaItem>();
  private projects = new Map<string, ProjectItem>();
  private tasks = new Map<string, ProjectTask>();

  private constructor() {
    this.registerBusHandlers();
  }

  static getInstance(): ProjectManagerService {
    if (!ProjectManagerService.instance) {
      ProjectManagerService.instance = new ProjectManagerService();
    }
    return ProjectManagerService.instance;
  }

  /**
   * Registers Project Manager query handlers on the central Agent Bus.
   */
  private registerBusHandlers(): void {
    // 1. Peer agents can query PM for project summaries
    agentBus.registerQueryHandler<{ projectId?: string }, ProjectSummary[]>(
      'pm',
      'get_project_summary',
      async (query) => {
        if (query.payload.projectId) {
          const summary = this.getProjectSummary(query.payload.projectId);
          return summary ? [summary] : [];
        }
        return this.getAllProjectSummaries();
      }
    );

    // 2. Peer agents can query PM for task lists
    agentBus.registerQueryHandler<{ projectId?: string; status?: TaskStatus }, ProjectTask[]>(
      'pm',
      'list_tasks',
      async (query) => {
        let list = Array.from(this.tasks.values());
        if (query.payload.projectId) {
          list = list.filter((t) => t.projectId === query.payload.projectId);
        }
        if (query.payload.status) {
          list = list.filter((t) => t.status === query.payload.status);
        }
        return list;
      }
    );

    // 3. Peer agents can capture new ideas via PM
    agentBus.registerQueryHandler<
      { title: string; description?: string; tags?: string[] },
      IdeaItem
    >('pm', 'capture_idea', async (query) => {
      return this.captureIdea(
        query.payload.title,
        query.payload.description || '',
        query.payload.tags || []
      );
    });
  }

  // --- Ideas & Backlog Operations ---

  captureIdea(title: string, description = '', tags: string[] = []): IdeaItem {
    if (!title || !title.trim()) {
      throw new Error('Idea title cannot be empty');
    }

    const now = Date.now();
    const idea: IdeaItem = {
      id: `idea_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
      status: 'captured',
      createdAt: now,
      updatedAt: now,
    };

    this.ideas.set(idea.id, idea);
    return idea;
  }

  updateIdeaStatus(ideaId: string, status: IdeaStatus): IdeaItem {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      throw new Error(`Idea ${ideaId} not found`);
    }
    idea.status = status;
    idea.updatedAt = Date.now();
    return idea;
  }

  getIdeas(statusFilter?: IdeaStatus): IdeaItem[] {
    const list = Array.from(this.ideas.values());
    if (statusFilter) {
      return list.filter((i) => i.status === statusFilter);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  deleteIdea(ideaId: string): boolean {
    return this.ideas.delete(ideaId);
  }

  // --- Project Operations ---

  createProject(
    title: string,
    description = '',
    priority: PriorityLevel = 'medium',
    milestones: Omit<Milestone, 'id'>[] = [],
    deadline?: number,
    ideaId?: string
  ): ProjectItem {
    if (!title || !title.trim()) {
      throw new Error('Project title cannot be empty');
    }

    const now = Date.now();
    const formattedMilestones: Milestone[] = milestones.map((m, index) => ({
      id: `ms_${now}_${index}_${Math.random().toString(36).substring(2, 5)}`,
      title: m.title.trim(),
      targetDate: m.targetDate,
      isCompleted: !!m.isCompleted,
    }));

    const project: ProjectItem = {
      id: `proj_${now}_${Math.random().toString(36).substring(2, 7)}`,
      ideaId,
      title: title.trim(),
      description: description.trim(),
      status: 'planning',
      priority,
      milestones: formattedMilestones,
      deadline,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(project.id, project);

    // If originated from an idea, mark idea converted
    if (ideaId && this.ideas.has(ideaId)) {
      const idea = this.ideas.get(ideaId)!;
      idea.status = 'converted';
      idea.convertedProjectId = project.id;
      idea.updatedAt = now;
    }

    return project;
  }

  convertIdeaToProject(
    ideaId: string,
    projectTitle?: string,
    milestones: Omit<Milestone, 'id'>[] = [],
    priority: PriorityLevel = 'medium',
    deadline?: number
  ): ProjectItem {
    const idea = this.ideas.get(ideaId);
    if (!idea) {
      throw new Error(`Idea ${ideaId} not found`);
    }

    const title = projectTitle && projectTitle.trim() ? projectTitle.trim() : idea.title;
    return this.createProject(title, idea.description, priority, milestones, deadline, ideaId);
  }

  updateProjectStatus(projectId: string, status: ProjectStatus): ProjectItem {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    project.status = status;
    project.updatedAt = Date.now();
    return project;
  }

  toggleMilestone(projectId: string, milestoneId: string): ProjectItem {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found in project ${projectId}`);
    }
    milestone.isCompleted = !milestone.isCompleted;
    project.updatedAt = Date.now();
    return project;
  }

  getProject(projectId: string): ProjectItem | undefined {
    return this.projects.get(projectId);
  }

  getProjects(statusFilter?: ProjectStatus): ProjectItem[] {
    const list = Array.from(this.projects.values());
    if (statusFilter) {
      return list.filter((p) => p.status === statusFilter);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  deleteProject(projectId: string): boolean {
    // Delete associated tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.projectId === projectId) {
        this.tasks.delete(taskId);
      }
    }
    return this.projects.delete(projectId);
  }

  // --- Task Breakdown Operations ---

  addTask(
    projectId: string,
    title: string,
    priority: PriorityLevel = 'medium',
    deadline?: number,
    milestoneId?: string,
    description?: string
  ): ProjectTask {
    if (!title || !title.trim()) {
      throw new Error('Task title cannot be empty');
    }
    if (!this.projects.has(projectId)) {
      throw new Error(`Project ${projectId} does not exist`);
    }

    const now = Date.now();
    const task: ProjectTask = {
      id: `task_${now}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      milestoneId,
      title: title.trim(),
      description: description?.trim(),
      priority,
      status: 'todo',
      deadline,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): ProjectTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    task.status = status;
    task.updatedAt = Date.now();
    return task;
  }

  getTasksForProject(projectId: string): ProjectTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  // --- Summaries & Progress Calculation ---

  getProjectSummary(projectId: string): ProjectSummary | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const projectTasks = this.getTasksForProject(projectId);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;
    const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      project,
      totalTasks,
      completedTasks,
      pendingTasks,
      progressPercentage,
    };
  }

  getAllProjectSummaries(): ProjectSummary[] {
    return Array.from(this.projects.keys())
      .map((id) => this.getProjectSummary(id)!)
      .filter(Boolean);
  }

  // --- Cross-Agent Collaboration ---

  /**
   * Schedules calendar focus blocks with Butler for upcoming project deadlines or milestones.
   */
  async scheduleMilestoneOnCalendar(
    projectId: string,
    milestoneId: string,
    durationMs = 3600000 // 1 hour default
  ): Promise<{ scheduled: boolean; eventId?: string }> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    const startTime = milestone.targetDate;
    const endTime = startTime + durationMs;

    const response = await agentBus.askAgent<
      { title: string; startTime: number; endTime: number; category: string },
      { id: string }
    >('pm', 'butler', 'schedule_event', {
      title: `[Project: ${project.title}] ${milestone.title}`,
      startTime,
      endTime,
      category: 'focus_block',
    });

    if (response.success && response.data) {
      return { scheduled: true, eventId: response.data.id };
    }
    return { scheduled: false };
  }

  clearAll(): void {
    this.ideas.clear();
    this.projects.clear();
    this.tasks.clear();
  }
}

export const projectManagerAgent = ProjectManagerService.getInstance();
