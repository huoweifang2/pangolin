<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  loading,
  totalSkills,
  newSkill,
  canAddSkill,
  savingSkill,
  addSkill,
  skills,
  skillLabel,
  deletingSkillId,
  removeSkill,
  totalServers,
  newServer,
  transportOptions,
  canAddServer,
  savingServer,
  addMcpServer,
  mcpServers,
  serverLabel,
  deletingServerId,
  removeMcpServer,
} = useInjectedFirewallOpsConsole()
</script>

<template>
  <v-row class="mt-2">
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Custom Skills</span>
          <v-spacer />
          <v-chip size="small" variant="tonal">{{ totalSkills }}</v-chip>
        </v-card-title>
        <v-divider />

        <div class="pa-4">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newSkill.id"
                label="Skill ID"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newSkill.name"
                label="Name (optional)"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newSkill.description"
                label="Description (optional)"
                density="comfortable"
                hide-details
              />
            </v-col>
          </v-row>
          <div class="d-flex justify-end mt-3">
            <v-btn
              color="success"
              prepend-icon="mdi-plus"
              :disabled="!canAddSkill"
              :loading="savingSkill"
              @click="addSkill"
            >
              Save Skill
            </v-btn>
          </div>
        </div>

        <v-divider />

        <v-list lines="two" density="compact">
          <v-list-item
            v-for="skill in skills"
            :key="skill.id"
            :title="skillLabel(skill)"
            :subtitle="skill.description ?? skill.id"
          >
            <template #append>
              <v-btn
                variant="text"
                color="error"
                icon="mdi-delete-outline"
                :loading="deletingSkillId === skill.id"
                @click="removeSkill(skill.id)"
              />
            </template>
          </v-list-item>
        </v-list>

        <v-alert
          v-if="!loading && totalSkills === 0"
          type="info"
          variant="tonal"
          class="ma-4"
        >
          No custom skills configured.
        </v-alert>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Custom MCP Servers</span>
          <v-spacer />
          <v-chip size="small" variant="tonal">{{ totalServers }}</v-chip>
        </v-card-title>
        <v-divider />

        <div class="pa-4">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newServer.id"
                label="Server ID"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newServer.name"
                label="Name (optional)"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="newServer.transport"
                :items="transportOptions"
                label="Transport"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newServer.url"
                label="URL / command (optional)"
                density="comfortable"
                hide-details
              />
            </v-col>
          </v-row>
          <div class="d-flex justify-end mt-3">
            <v-btn
              color="warning"
              prepend-icon="mdi-plus"
              :disabled="!canAddServer"
              :loading="savingServer"
              @click="addMcpServer"
            >
              Save MCP Server
            </v-btn>
          </div>
        </div>

        <v-divider />

        <v-list lines="two" density="compact">
          <v-list-item
            v-for="server in mcpServers"
            :key="server.id"
            :title="serverLabel(server)"
            :subtitle="server.url ?? 'No URL configured'"
          >
            <template #append>
              <v-chip size="x-small" variant="tonal" color="warning" class="mr-2">
                {{ server.transport ?? 'unknown' }}
              </v-chip>
              <v-btn
                variant="text"
                color="error"
                icon="mdi-delete-outline"
                :loading="deletingServerId === server.id"
                @click="removeMcpServer(server.id)"
              />
            </template>
          </v-list-item>
        </v-list>

        <v-alert
          v-if="!loading && totalServers === 0"
          type="info"
          variant="tonal"
          class="ma-4"
        >
          No custom MCP servers configured.
        </v-alert>
      </v-card>
    </v-col>
  </v-row>
</template>
