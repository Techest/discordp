import { Client as ClientJS, ClientOptions, Interaction } from "discord.js"
import { Slash } from "./ts/interface/Slash"
import { SlashInfo } from "./ts/interface/SlashInfo"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { DeployType } from "./ts/types/DeployType"
import Logger from "@pleahmacaka/logger"

export class Client extends ClientJS {

	debug: boolean

	constructor(options: ClientOptions, debug?: boolean) {
		super(options)
		this.debug = debug
	}

	private static _allSlash: Map<string, Slash> = new Map<string, Slash>()

	private static _allSlashInfo: Map<string, SlashInfo> = new Map<string, SlashInfo>()

	public static allSlashInfo(): Array<SlashInfo> {
		return Array.from(this._allSlashInfo.values())
	}

	public getAllGuildsId() {
		return this.guilds.cache.map(guild => guild.id)
	}

	public static addSlash(slash: Slash) {
		this._allSlashInfo.set(slash.name, {
			name: slash.name,
			description: slash.description ? slash.description : ""
		})
		// TODO add verity name check
		this._allSlash.set(slash.name, slash)
	}

	public addSlash(slash: Slash) {
		Client.addSlash(slash)
	}

	private _slashInteractionHandler() {
		this.on('interactionCreate', async (interaction: Interaction) => {
			if (!interaction.isCommand()) return

			try {
				await Client._allSlash.get(interaction.commandName)!!.execute(interaction, this)
			} catch (e) {
				return console.error(`unknown command is executed! -> What is [${interaction.commandName}]?`)
			}
		})
	}

	// deploy the slash command
	public deploy(token: string, deployType: DeployType = "GUILD") {
		// TODO Automatic command deploy when the bot join to the guild
		this._slashInteractionHandler()
		const rest = new REST({ version: '9' }).setToken(token)

		if (this.debug) Logger.log("INFO", "Starting deploy (/) commands.")
		if (this.debug) {
			Logger.log("DEBUG", "✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧")
			Logger.log("DEBUG", "ALL SLASH:")
			Client._allSlashInfo.forEach(slash => {
				Logger.log("DEBUG", `${slash.name} :: ${slash.description}`)
			})
			Logger.log("DEBUG", "✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧⋄⋆⋅⋆⋄✧")
		}

		if (deployType == "GUILD") {
			this.getAllGuildsId().forEach(async (guild) => {
				try {
					if (this.debug) Logger.log("DEBUG", `DEPLOY -> ${guild}`)
					await rest.put(
						Routes.applicationGuildCommands(this.user!!.id, guild),
						{ body: Client.allSlashInfo() }
					)
				} catch (e) {
					/*
					* about the error case (reason: Client network socket disconnected before secure TLS connection was established):
					* ref this: https://stackoverflow.com/questions/53593182/client-network-socket-disconnected-before-secure-tls-connection-was-established
					* or sometimes you just have to keep trying
					*/
					console.log(e)
				}
			})
		}
		if (deployType == "GLOBAL") {
			rest.put(
				Routes.applicationCommands(this.user!!.id),
				{ body: Client.allSlashInfo() }
			).then(() => {
				Logger.log("DEBUG", "GLOBALLY DEPLOYED!")
			})
		}
	}
}