import { Guild, Channel, GuildMember, User } from "discord-types/general";
import { NavContextMenuPatchCallback, addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import definePlugin, { OptionType } from "@utils/types";
import { Card, Forms, Menu, Paginator, Popout, SearchableSelect, useState } from "@webpack/common";
import { InfoIcon } from "@components/Icons";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { openImageModal } from "@utils/discord";
import { UserStore, GuildChannelStore, GuildMemberStore, GuildStore } from "@webpack/common";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { cl } from "@components/ExpandableHeader";
import { set } from "lodash";





const settings = definePluginSettings({
    role: {
        type: OptionType.STRING,
        description: "Select role to query",
        hidden: true
    },
    guild: {
        type: OptionType.STRING,
        description: "Select guild to query",
        hidden: true
    },
    other_guild: {
        type: OptionType.STRING,
        description: "Select other_guild to query",
        hidden: true
    }
});


interface GuildContextProps {
    guild?: Guild;
}

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: GuildContextProps) => () => {
    if (!guild) return;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="compare-server"
                label="Compare Server"
                icon={InfoIcon}
                action={() => openModal(props => (
                    <CompareServerModal rootProps={props} guild={guild} />
                ))}
            />
        </Menu.MenuGroup>
    ));
};

function CompareServerModal({ rootProps, guild }: { rootProps: ModalProps; guild: Guild; }) {
    return (
        <ModalRoot {...rootProps} size={ModalSize.LARGE}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h1">Compare Server Modal</Forms.FormTitle>
            </ModalHeader>
            <ModalContent className={cl("modal-content")} style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
            }}>
                <div>
                    <br/>
                    <Forms.FormTitle tag="h2">{guild.name}</Forms.FormTitle>
                    <Forms.FormDivider/>
                    <br/>
                    <Forms.FormText>ID:  {guild.id}</Forms.FormText>
                    <Forms.FormText>Description:  {guild.description}</Forms.FormText>
                    <RoleKey guild={guild} />
                    <OtherGuildKey guild={guild} />
                </div>
                <div>
                    <br />
                    <Forms.FormTitle tag="h2">Users</Forms.FormTitle>
                    <Forms.FormDivider></Forms.FormDivider>
                    <br/>
                    <UserFilter guild={guild} />
                </div>
            </ModalContent>

        </ModalRoot>
    );
}

interface option {
    value: string,
    label: any;
}

function RoleKey({ guild }: { guild: Guild; }) {
    ;
    settings.store.guild = guild.id;
    let roles: option[] = [];
    Object.values(guild.roles).forEach(r => roles.push({
        value: r.id,
        label: r.name
    }));
    roles.push({
        value: "0",
        label: "None"
    });

    return (
        <section className="role-section">
            <Forms.FormTitle tag="h3">
                Roles
            </Forms.FormTitle>
            <br />
            <SearchableSelect
                options={roles}
                placeholder="Select a role to filter"
                value={settings.use(["role"]).role}
                maxVisibleItems={5}
                closeOnSelect={true}
                onChange={v => settings.store.role = v}
            />
            <br />
        </section>
    );
}

function OtherGuildKey({ guild }: { guild: Guild; }) {
    let other_guilds: option[] = [];
    Object.values(GuildStore.getGuilds()).forEach(r => other_guilds.push({
        value: r.id,
        label: r.name
    }));

    other_guilds.push({
        value: "0",
        label: "None"
    });
    return (
        <section className="other-guild-section">
            <Forms.FormTitle tag="h3">
                Other Guilds
            </Forms.FormTitle>
            <br />
            <SearchableSelect
                options={other_guilds}
                placeholder="Select a guild to compare/filter"
                value={settings.use(["other_guild"]).other_guild}
                maxVisibleItems={5}
                closeOnSelect={true}
                onChange={v => settings.store.other_guild = v}
            />
            <br />
        </section>
    );
}





function UserFilter({ guild }: { guild: Guild }) {
    const [page, setPage] = useState(1);

    const members = calculateMembers(guild);

    const pageSize = 6;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return (
        <div>
            <Card style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
            }}>
                {members.slice(startIndex, endIndex).map((m) => (
                    <UserCard member={m} key={m.userId}></UserCard>
                ))}
            </Card>
            <Paginator
                pageSize={pageSize}
                currentPage={page}
                maxVisiblePages={4}
                totalCount={members.length}
                hideMaxPage={false}
                onPageChange={(newPage) => setPage(newPage)}
            ></Paginator>
        </div>
    );

    function calculateMembers(guild: Guild): GuildMember[] {
        const filteredMembers: GuildMember[] = [];
        const targetRole = settings.use(['role']).role;
        const targetGuild = settings.use(['other_guild']).other_guild;
    
        for (const member of GuildMemberStore.getMembers(guild.id)) {
            let shouldAddMember = true;
            if (targetGuild !== '0') {
                const existsInTargetGuild = GuildMemberStore
                    .getMembers(targetGuild)
                    .some(other_mem => other_mem.userId === member.userId);
                shouldAddMember = existsInTargetGuild;
            }
            if (shouldAddMember && targetRole !== '0') {
                const hasTargetRole = member.roles.includes(targetRole);
    
                shouldAddMember = hasTargetRole;
            }
    
            if (shouldAddMember) {
                filteredMembers.push(member);
            }
        }
    
        return filteredMembers;
    }
    
}


function UserCard({ member }: { member: GuildMember; }) {
    let user = UserStore.getUser(member.userId);
    return (
        <Card style={{
            borderRadius: "3px",
            filter: "brightness(100%)"
        }}>
            <Forms.FormTitle tag="h5">{user.username}</Forms.FormTitle>
            <Forms.FormText>ID: {member.userId}</Forms.FormText>
            <Forms.FormText>Nickname: {member.nick}</Forms.FormText>
            <Forms.FormText>Joined at: {member.joinedAt}</Forms.FormText>
            <Forms.FormText>Created at: {user.createdAt.toDateString()}</Forms.FormText>
        </Card>
    );
}






export default definePlugin({
    name: "Guild Lookup",
    description: "Query tools regarding guilds",
    authors: [{ name: "Shell", id: 1056383259325513888n }],
    settings,

    start() {
        addContextMenuPatch("guild-context", GuildContext);
    },

    stop() {
        removeContextMenuPatch("guild-context", GuildContext);
    }
});