import { ProjectManagerService, projectManagerAgent } from '../../src/agents/ProjectManagerService';
import { ButlerAgentService, butlerAgent } from '../../src/agents/ButlerAgentService';
import { agentBus } from '../../src/kernel/AgentBusService';

describe('ProjectManagerService (Task 3.4)', () => {
  let pm: ProjectManagerService;

  beforeEach(() => {
    pm = ProjectManagerService.getInstance();
    pm.clearAll();
    butlerAgent.clearAll();
  });

  describe('Idea & Backlog Management', () => {
    it('captures a new idea successfully with tags and default status', () => {
      const idea = pm.captureIdea('AI Voice Journal', 'Offline voice reflections', ['ai', 'voice']);

      expect(idea.id).toMatch(/^idea_/);
      expect(idea.title).toBe('AI Voice Journal');
      expect(idea.description).toBe('Offline voice reflections');
      expect(idea.tags).toEqual(['ai', 'voice']);
      expect(idea.status).toBe('captured');
      expect(pm.getIdeas()).toHaveLength(1);
    });

    it('throws error when capturing idea with empty title', () => {
      expect(() => pm.captureIdea('')).toThrow('Idea title cannot be empty');
      expect(() => pm.captureIdea('   ')).toThrow('Idea title cannot be empty');
    });

    it('updates idea status and timestamp', () => {
      const idea = pm.captureIdea('Smart Recipe Generator');
      const updated = pm.updateIdeaStatus(idea.id, 'exploring');

      expect(updated.status).toBe('exploring');
      expect(pm.getIdeas('exploring')).toHaveLength(1);
      expect(pm.getIdeas('captured')).toHaveLength(0);
    });

    it('throws error when updating non-existent idea status', () => {
      expect(() => pm.updateIdeaStatus('idea_non_existent', 'exploring')).toThrow(
        'Idea idea_non_existent not found'
      );
    });

    it('deletes an idea from backlog', () => {
      const idea = pm.captureIdea('Ephemeral P2P chat');
      expect(pm.deleteIdea(idea.id)).toBe(true);
      expect(pm.getIdeas()).toHaveLength(0);
      expect(pm.deleteIdea('unknown_id')).toBe(false);
    });
  });

  describe('Project Creation & Milestone Tracking', () => {
    it('creates project with milestones and priority', () => {
      const targetDate = Date.now() + 86400000;
      const project = pm.createProject(
        'Skuld Mobile Companion',
        'Next-gen personal OS',
        'critical',
        [{ title: 'MVP Alpha Release', targetDate, isCompleted: false }],
        targetDate + 7 * 86400000
      );

      expect(project.id).toMatch(/^proj_/);
      expect(project.title).toBe('Skuld Mobile Companion');
      expect(project.status).toBe('planning');
      expect(project.priority).toBe('critical');
      expect(project.milestones).toHaveLength(1);
      expect(project.milestones[0].title).toBe('MVP Alpha Release');
      expect(project.milestones[0].isCompleted).toBe(false);
    });

    it('throws error when creating project with empty title', () => {
      expect(() => pm.createProject('')).toThrow('Project title cannot be empty');
    });

    it('converts an idea directly into a project and updates idea status', () => {
      const idea = pm.captureIdea('Zero Knowledge Health Vault', 'Encrypt health metrics');
      const project = pm.convertIdeaToProject(idea.id, 'ZK Health App', [
        { title: 'Schema Spec', targetDate: Date.now() + 3600000, isCompleted: false },
      ]);

      expect(project.ideaId).toBe(idea.id);
      expect(project.title).toBe('ZK Health App');

      const convertedIdea = pm.getIdeas().find((i) => i.id === idea.id);
      expect(convertedIdea?.status).toBe('converted');
      expect(convertedIdea?.convertedProjectId).toBe(project.id);
    });

    it('converts an idea using idea title when project title is omitted', () => {
      const idea = pm.captureIdea('Default Title Idea');
      const project = pm.convertIdeaToProject(idea.id);
      expect(project.title).toBe('Default Title Idea');
    });

    it('throws error converting non-existent idea', () => {
      expect(() => pm.convertIdeaToProject('idea_missing')).toThrow('Idea idea_missing not found');
    });

    it('updates project status and filters active projects', () => {
      const project = pm.createProject('Project A');
      pm.updateProjectStatus(project.id, 'in_progress');

      expect(pm.getProjects('in_progress')).toHaveLength(1);
      expect(pm.getProjects('completed')).toHaveLength(0);
    });

    it('throws error updating status for non-existent project', () => {
      expect(() => pm.updateProjectStatus('proj_missing', 'in_progress')).toThrow(
        'Project proj_missing not found'
      );
    });

    it('toggles milestone completion status', () => {
      const project = pm.createProject('Project With Milestones', '', 'medium', [
        { title: 'Milestone 1', targetDate: Date.now() + 1000, isCompleted: false },
      ]);
      const milestoneId = project.milestones[0].id;

      const updated = pm.toggleMilestone(project.id, milestoneId);
      expect(updated.milestones[0].isCompleted).toBe(true);

      const toggledBack = pm.toggleMilestone(project.id, milestoneId);
      expect(toggledBack.milestones[0].isCompleted).toBe(false);
    });

    it('throws error toggling non-existent milestone or project', () => {
      expect(() => pm.toggleMilestone('proj_missing', 'ms_missing')).toThrow(
        'Project proj_missing not found'
      );

      const project = pm.createProject('Project Without Milestones');
      expect(() => pm.toggleMilestone(project.id, 'ms_missing')).toThrow(
        `Milestone ms_missing not found in project ${project.id}`
      );
    });

    it('deletes a project and cascades deletion to its tasks', () => {
      const project = pm.createProject('Project To Delete');
      pm.addTask(project.id, 'Task 1');
      pm.addTask(project.id, 'Task 2');

      expect(pm.getTasksForProject(project.id)).toHaveLength(2);
      expect(pm.deleteProject(project.id)).toBe(true);
      expect(pm.getProject(project.id)).toBeUndefined();
      expect(pm.getTasksForProject(project.id)).toHaveLength(0);
    });
  });

  describe('Task Breakdown & Lifecycle', () => {
    it('adds task to existing project and updates status', () => {
      const project = pm.createProject('Project Alpha');
      const task = pm.addTask(project.id, 'Design SQLite Schema', 'high');

      expect(task.id).toMatch(/^task_/);
      expect(task.title).toBe('Design SQLite Schema');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('todo');

      const updatedTask = pm.updateTaskStatus(task.id, 'in_progress');
      expect(updatedTask.status).toBe('in_progress');
    });

    it('throws error adding task with empty title or non-existent project', () => {
      const project = pm.createProject('Project Alpha');
      expect(() => pm.addTask(project.id, '')).toThrow('Task title cannot be empty');
      expect(() => pm.addTask('proj_unknown', 'Some Task')).toThrow(
        'Project proj_unknown does not exist'
      );
    });

    it('throws error updating non-existent task status', () => {
      expect(() => pm.updateTaskStatus('task_unknown', 'done')).toThrow('Task task_unknown not found');
    });

    it('deletes a task', () => {
      const project = pm.createProject('Project Alpha');
      const task = pm.addTask(project.id, 'Task To Delete');

      expect(pm.deleteTask(task.id)).toBe(true);
      expect(pm.deleteTask('unknown_id')).toBe(false);
      expect(pm.getTasksForProject(project.id)).toHaveLength(0);
    });
  });

  describe('Project Summaries & Metrics', () => {
    it('computes accurate progress percentage and metrics', () => {
      const project = pm.createProject('Project Metrics');
      const t1 = pm.addTask(project.id, 'Task 1');
      const t2 = pm.addTask(project.id, 'Task 2');
      const t3 = pm.addTask(project.id, 'Task 3');
      const t4 = pm.addTask(project.id, 'Task 4');

      pm.updateTaskStatus(t1.id, 'done');
      pm.updateTaskStatus(t2.id, 'done');

      const summary = pm.getProjectSummary(project.id);
      expect(summary).not.toBeNull();
      expect(summary?.totalTasks).toBe(4);
      expect(summary?.completedTasks).toBe(2);
      expect(summary?.pendingTasks).toBe(2);
      expect(summary?.progressPercentage).toBe(50);

      const allSummaries = pm.getAllProjectSummaries();
      expect(allSummaries).toHaveLength(1);
    });

    it('returns 0 progress percentage when project has no tasks', () => {
      const project = pm.createProject('Empty Project');
      const summary = pm.getProjectSummary(project.id);
      expect(summary?.progressPercentage).toBe(0);
    });

    it('returns null summary for non-existent project', () => {
      expect(pm.getProjectSummary('non_existent')).toBeNull();
    });
  });

  describe('Central Agent Bus Integration & Cross-Agent Collaboration', () => {
    it('answers get_project_summary query from peer agents', async () => {
      const project = pm.createProject('Bus Query Project');
      pm.addTask(project.id, 'Bus Task');

      const response = await agentBus.askAgent<
        { projectId?: string },
        Array<{ project: { id: string } }>
      >('butler', 'pm', 'get_project_summary', { projectId: project.id });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data![0].project.id).toBe(project.id);
    });

    it('answers list_tasks query from peer agents', async () => {
      const project = pm.createProject('Bus Tasks Project');
      const t1 = pm.addTask(project.id, 'Task Todo', 'medium');
      const t2 = pm.addTask(project.id, 'Task Done', 'high');
      pm.updateTaskStatus(t2.id, 'done');

      const response = await agentBus.askAgent<
        { projectId: string; status?: string },
        Array<{ id: string; status: string }>
      >('butler', 'pm', 'list_tasks', { projectId: project.id, status: 'done' });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data![0].id).toBe(t2.id);
    });

    it('allows peer agents to capture ideas on PM backlog', async () => {
      const response = await agentBus.askAgent<
        { title: string; description: string; tags: string[] },
        { id: string; title: string }
      >('butler', 'pm', 'capture_idea', {
        title: 'Peer Discovered Idea',
        description: 'Captured via conversation',
        tags: ['collaboration'],
      });

      expect(response.success).toBe(true);
      expect(response.data?.title).toBe('Peer Discovered Idea');
      expect(pm.getIdeas()).toHaveLength(1);
    });

    it('schedules milestone focus blocks with Butler over Agent Bus', async () => {
      const targetDate = Date.now() + 7200000;
      const project = pm.createProject('Architecture Overhaul', '', 'high', [
        { title: 'Core Refactor Milestone', targetDate, isCompleted: false },
      ]);
      const milestoneId = project.milestones[0].id;

      const scheduleResult = await pm.scheduleMilestoneOnCalendar(project.id, milestoneId);
      expect(scheduleResult.scheduled).toBe(true);
      expect(scheduleResult.eventId).toBeDefined();

      const upcomingEvents = butlerAgent.getUpcomingEvents();
      expect(upcomingEvents).toHaveLength(1);
      expect(upcomingEvents[0].title).toBe(
        `[Project: Architecture Overhaul] Core Refactor Milestone`
      );
      expect(upcomingEvents[0].category).toBe('focus_block');
    });

    it('fails gracefully when scheduling non-existent project or milestone', async () => {
      await expect(pm.scheduleMilestoneOnCalendar('missing_proj', 'ms_1')).rejects.toThrow(
        'Project missing_proj not found'
      );

      const project = pm.createProject('Empty Milestone Project');
      await expect(pm.scheduleMilestoneOnCalendar(project.id, 'ms_missing')).rejects.toThrow(
        'Milestone ms_missing not found'
      );
    });
  });
});
