import { Project } from '../models/project';
import { ConnectionManager } from './connection_manager';
import { DtoProject } from '../interfaces/dto_project';
import { ResObject } from '../common/res_object';
import { Message } from '../common/message';
import { StringUtil } from '../utils/string_util';
import { User } from '../models/user';
import { UserService } from './user_service';

export class ProjectService {

    static create(id: string) {
        const project = new Project();
        project.id = id;
        return project;
    }

    static fromDto(dtoProject: DtoProject, ownerId: string): Project {
        let project = ProjectService.create(dtoProject.id || StringUtil.generateUID());
        project.name = dtoProject.name;
        project.note = dtoProject.note;

        const owner = new User();
        owner.id = ownerId;
        project.owner = owner;

        return project;
    }

    static async getProject(id: string, needOwner: boolean = true, needCollection: boolean = true, needUser: boolean = false, needEnv: boolean = false): Promise<Project> {
        const connection = await ConnectionManager.getInstance();

        let rep = connection.getRepository(Project).createQueryBuilder('project');
        if (needCollection) {
            rep = rep.leftJoinAndSelect('project.collections', 'collection');
        }
        if (needUser) {
            rep = rep.leftJoinAndSelect('project.members', 'members');
        }
        if (needOwner) {
            rep = rep.leftJoinAndSelect('project.owner', 'owner');
        }
        if (needEnv) {
            rep = rep.leftJoinAndSelect('project.environments', 'environments');
        }

        return await rep.where('project.id=:id')
            .setParameter('id', id)
            .getOne();
    }

    static async getProjects(ids: string[], needOwner: boolean = true, needCollection: boolean = true, needUser: boolean = false, needEnv: boolean = false): Promise<Project[]> {
        if (ids.length === 0) {
            throw new Error('at least a project');
        }

        const connection = await ConnectionManager.getInstance();

        let rep = connection.getRepository(Project).createQueryBuilder('project');
        if (needCollection) {
            rep = rep.leftJoinAndSelect('project.collections', 'collection');
        }
        if (needUser) {
            rep = rep.leftJoinAndSelect('project.members', 'members');
        }
        if (needOwner) {
            rep = rep.leftJoinAndSelect('project.owner', 'owner');
        }
        if (needEnv) {
            rep = rep.leftJoinAndSelect(`project.environments`, 'environment');
        }

        return await rep.where('1=1')
            .andWhereInIds(ids.map(id => ({ id })))
            .getMany();
    }

    static async createProject(dtoProject: DtoProject, ownerId: string): Promise<ResObject> {
        const connection = await ConnectionManager.getInstance();
        const project = ProjectService.fromDto(dtoProject, ownerId);
        const user = await UserService.getUserById(ownerId, true);
        project.members.push(user);

        await connection.getRepository(Project).persist(project);

        return { success: true, message: Message.projectSaveSuccess };
    }

    static async createOwnProject(owner: User): Promise<Project> {
        const connection = await ConnectionManager.getInstance();
        let project = ProjectService.create(StringUtil.generateUID());
        project.name = 'Me';
        project.owner = owner;
        project.isMe = true;
        project.members.push(owner);

        return await connection.getRepository(Project).persist(project);
    }


    static async updateProject(dtoProject: DtoProject): Promise<ResObject> {
        const connection = await ConnectionManager.getInstance();

        await connection.getRepository(Project)
            .createQueryBuilder('project')
            .where('id=:id', { id: dtoProject.id })
            .update({ name: dtoProject.name, note: dtoProject.note })
            .execute();

        return { success: true, message: Message.projectSaveSuccess };
    }

    static async save(project: Project): Promise<ResObject> {
        const connection = await ConnectionManager.getInstance();
        await connection.getRepository(Project).persist(project);

        return { success: true, message: Message.projectSaveSuccess };
    }

    static async delete(id: string): Promise<ResObject> {
        const connection = await ConnectionManager.getInstance();
        await connection.getRepository(Project).createQueryBuilder('project')
            .delete()
            .where('project.id=:id', { id: id })
            .execute();
        return { success: true, message: Message.projectDeleteSuccess };
    }
}