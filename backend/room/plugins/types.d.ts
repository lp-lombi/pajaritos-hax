import MainReturnType from  "../../node_modules/node-haxball/src/index"
export const API = MainReturnType()
import sqlite3 from "sqlite3";

export class Room extends API["Room"] {}
export class Player extends API["Player"] {}

export class CommandsPlugin extends API["Plugin"] {
    commandsList: Command[];
    data: {
        discord: string;
        webApi: {
            url: string;
            key: string;
        }
    }
    chatLog: string[];
    onPlayerJoinQueue: Function[];
    onPlayerLeaveQueue: Function[];
    onGameStartQueue: Function[];
    onGameEndQueue: Function[];
    onTeamGoalQueue: Function[];
    sendInputQueue: Function[];
    isAdmin() : boolean;
    /**
     * Escribe algo en el chat con estilos predeterminados
     * @param msg Texto del mensaje
     * @param targetId Id del destinatario o null para todos
     * @param type Estilo del mensaje
     * @param byId Si el mensaje fue emitido por alguien
     */
    printchat(msg: string, targetId: number | null, type: "info" | "alert" | "error" | "announcement" | "announcement-mute" | "hint" | "chat" | "pm" | "tm" | "stat" | null, byId: number) : void;
    getDb(): sqlite3.Database
    getPlayers(): Player[];
    getColors(): {color: number}
    getCommands(): Command[];
    log(text: string, color: number, style: string): void;
    /**
     * @param prefix Caracter de inicio del comando
     * @param desc Descripción del comando
     * @param admin Si el comando solo puede ser ejecutado por administradores
     * @param hidden Si el comando se lista en !help
     * @param exec La función callback a ejecutar
     * 
     * Permite registrar un comando personalizado con una acción la cual es llamada cuando sea escrito en el chat
     */
    registerCommand(prefix: string, desc: string, admin: boolean, hidden: boolean, exec: (msg: Object, args: string[]) => any | void): void;
} 

/** Componentes de un comando. */
export type Command = {
    prefix: string;
    desc: string;
    admin: boolean;
    hidden: boolean;
    exec: (msg: Object, args: string[]) => any | void;
}

/** Datos de una casaca obtenidos de la base de datos */
export type Kit = {
    id: number;
    name: string;
    cfg: string;
}