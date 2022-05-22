const { Plugin } = require('powercord/entities');
let { getModule, messages: { receiveMessage } } = require("powercord/webpack")
let { createBotMessage } = getModule(["createBotMessage"], false)

module.exports = class SlashTags extends Plugin {

    rawify(raw) {
        // stolen from one of my other plugins
        // github.com/captain8771/raw
        raw = raw.replaceAll("\\", "\\\\")
        raw = raw.replaceAll("*", "\\*")
        raw = raw.replaceAll("|", "\\|")
        raw = raw.replaceAll("_", "\\_")
        raw = raw.replaceAll(">", "\\>")
        raw = raw.replaceAll("~", "\\~")
        raw = raw.replaceAll("`", "\\`")
        raw = raw.replaceAll(":", "\\:")
        return raw
    }

    CreateCommand(name, description, options, callback, applicationId="-1") {
        getModule(["getBuiltInCommands"], false).BUILT_IN_COMMANDS.push({
            applicationId: applicationId,
            description: description,
            displayDescription: description,
            displayName: name,
            execute: (args, context) => {
                let res = callback(args, context)
                if (res) {
                    let msg = createBotMessage({channelId: context.channel.id, content: res.value})
                    msg.embeds = res.embeds
                    receiveMessage(context.channel.id, msg)
                }
            },
            id: `-${getModule(["getBuiltInCommands"], false).BUILT_IN_COMMANDS.length + 1}`,
            inputType: 0,
            name: name,
            options: options,
            type: 1,
        })
    }   

    RemoveCommand(name) {
        let cmds = getModule(["getBuiltInCommands"], false).BUILT_IN_COMMANDS
        cmds.pop(cmds.indexOf(cmds.find(i => i.name.toLowerCase() == name.toLowerCase())))
    }

    Option(name, desc, type=3, required=true) {
        return {
            name: name, 
            displayName: name, 
            type: type, 
            required: required, 
            description: desc, 
            displayDescription: desc
        }
    }
    
    startPlugin() {
        if (!this.settings.get("tags", false)) {
            this.settings.set("tags", [])
            this.tags = []
        } else {
            this.tags = this.settings.get("tags", [])
        }
        this.log(getModule(["getBuiltInCommands"], false).BUILT_IN_COMMANDS)
        while (!getModule(["getBuiltInCommands"], false).BUILT_IN_COMMANDS) {
            // wait for the command list to be loaded
        }

        for (let tag of this.tags) {
            this.CreateCommand(`tag-${tag.name}`, "User created tag", [], (args, context) => {
                return {
                    value: tag.content
                }
            })
        }


        this.CreateCommand(
            "tag create", 
            "Create a tag", 
            [
                this.Option("name", "The name of the tag"),
                this.Option("content", "The content of the tag")
            ], (args, context) => {
                return this.createTag(args[0].value, args[1].value)    
            }
        )

        this.CreateCommand(
            "tag delete",
            "Delete a tag",
            [
                this.Option("name", "The name of the tag")
            ], (args, context) => {
                return this.deleteTag(args[0].value)
            }
        )

        this.CreateCommand(
            "tag edit",
            "Edit a tag",
            [
                this.Option("name", "The name of the tag"),
                this.Option("content", "The new content of the tag")
            ], (args, context) => {
                let tag = this.tags.find(i => i.name.toLowerCase() == args[0].value.toLowerCase())
                if (tag) {
                    tag.content = args[1].value
                    this.settings.set("tags", this.tags)
                    return {
                        value: "Tag updated"
                    }
                } else {
                    return {
                        value: "Tag not found"
                    }
                }
            }
        )

        this.CreateCommand(
            "tag list",
            "List all tags",
            [], (args, context) => {
                return {
                    embeds: [
                        {
                            title: "Tags",
                            description: this.tags.map(i => `${i.name}`).join("\n"),
                            color: 7506394
                        }
                    ]
                }
            }
        )

        this.CreateCommand(
            "tag raw",
            "Get the raw content of a tag",
            [
                this.Option("name", "The name of the tag")
            ], (args, context) => {
                let tag = this.tags.find(i => i.name.toLowerCase() == args[0].value.toLowerCase())
                if (tag) {
                    return {
                        value: `\`\`\`\n${this.rawify(tag.content)}\`\`\``
                    }
                } else {
                    return {
                        value: "Tag not found"
                    }
                }
            }
        )

        this.CreateCommand(
            "tag help",
            "Get help on tags",
            [], (args, context) => {
                return {
                    embeds: [
                        {
                            title: "Help menu",
                            description: "`/tag create <name> <content>` - Create a tag\n`/tag delete <name>` - Delete a tag\n`/tag edit <name> <content>` - Edit a tag\n`/tag list` - List all tags\n`/tag raw <name>` - Get the raw content of a tag\n`/tag help` - Get help on tags",
                            color: 7506394
                        }
                    ]
                }
            }
        )

        
    }

    deleteTag(name) {
        let tag = this.tags.find(i => i.name.toLowerCase() == name.toLowerCase())
        if (tag) {
            this.tags.splice(this.tags.indexOf(tag), 1)
            this.settings.set("tags", this.tags)
            this.RemoveCommand(`tag-${tag.name}`)
            return {
                value: `Tag ${name} deleted`
            }
        } else {
            return {
                value: `Tag ${name} not found`
            }
        }
    }

    createTag(name, content) {
        // check if the tag exists, if so, return
        if (this.tags.find(i => i.name.toLowerCase() == name.toLowerCase())) {
            return {
                value: "Tag already exists"
            }
        }
        this.tags.push({
            name: name,
            content: content
        })
        this.settings.set("tags", this.tags)
        
        this.CreateCommand(
            `tag-${name}`, 
            "User created tag", 
            [], (args, context) => {
                return {
                    value: content
                }
            }
        )
        return {
            value: "Tag created"
        }
    }


    pluginWillUnload() {
        for (let command of this.tags) {
            this.RemoveCommand(`tag-${command.name}`)
        }
        this.RemoveCommand("tag create")
        this.RemoveCommand("tag remove")
        this.RemoveCommand("tag edit")
        this.RemoveCommand("tag list")
        this.RemoveCommand("tag help")
        this.RemoveCommand("tag raw")
    }
};
