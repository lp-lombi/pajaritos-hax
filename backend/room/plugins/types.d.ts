import MainReturnType from "../../node_modules/node-haxball/src/index";
export const API = MainReturnType();
import sqlite3 from "sqlite3";

export type BooleanFunction = () => boolean;

export class Room extends API["Room"] {}
export class Plugin extends API["Plugin"] {}
export class Player extends API["Player"] {}

export class CommandsPlugin extends API["Plugin"] {
    commandsList: Command[];
    data: {
        discord: string;
        webApi: {
            url: string;
            key: string;
        };
    };
    chatLog: string[];
    onOperationReceivedQueue: BooleanFunction[];
    initQueue: Function[];
    initQueue: Function[];
    onPlayerJoinQueue: Function[];
    onPlayerLeaveQueue: Function[];
    onGameStartQueue: Function[];
    onGameEndQueue: Function[];
    onTeamGoalQueue: Function[];
    sendInputQueue: Function[];
    isAdmin(): boolean;
    /**
     * Escribe algo en el chat con estilos predeterminados
     * @param msg Texto del mensaje
     * @param targetId Id del destinatario o null para todos
     * @param type Estilo del mensaje
     * @param byId Si el mensaje fue emitido por alguien
     */
    printchat(
        msg: string,
        targetId: number | null,
        type:
            | "info"
            | "alert"
            | "error"
            | "announcement"
            | "announcement-big"
            | "announcement-mute"
            | "hint"
            | "chat"
            | "pm"
            | "tm"
            | "stat"
            | "vip-message"
            | "warn"
            | null,
        byId: number
    ): void;
    getPlayersIdsString(): string;
    getDb(): sqlite3.Database;
    getPlayers(): Player[];
    getColors(): { color: number };
    getCommands(): Command[];
    log(text: string, color: number, style: string): void;
    isUserRoleAuthorized(playerId: number, requiredRole: number): boolean;
    /**
     * @param prefix Caracter de inicio del comando
     * @param name Nombre del comando
     * @param callback La función callback a ejecutar
     * @param desc Descripción del comando
     * @param role 0 es para todos, 1 es para helpers o staff intermedio, 2 para administradores
     * @param hidden Si el comando se lista en !help
     *
     * Permite registrar un comando personalizado con una acción la cual es llamada cuando sea escrito en el chat
     */
    registerCommand(
        prefix: string,
        name: string,
        callback: (msg: Object, args: string[]) => any | void,
        desc: string,
        role: 0 | 1 | 2,
        hidden: boolean
    ): void;
}

/** Componentes de un comando. */
export type Command = {
    prefix: string;
    desc: string;
    admin: boolean;
    hidden: boolean;
    exec: (msg: Object, args: string[]) => any | void;
};

/** Datos de una casaca obtenidos de la base de datos */
export type Kit = {
    id: number;
    name: string;
    cfg: string;
};
