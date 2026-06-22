{{- define "patient-history-agent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "patient-history-agent.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "patient-history-agent.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: patient-history-agent
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: aegis-health
app.kubernetes.io/component: agent
{{- end }}

{{- define "patient-history-agent.selectorLabels" -}}
app.kubernetes.io/name: patient-history-agent
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
