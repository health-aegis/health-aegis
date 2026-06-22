{{- define "diagnostic-agent-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "diagnostic-agent-service.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "diagnostic-agent-service.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: diagnostic-agent-service
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: aegis-health
app.kubernetes.io/component: agent
{{- end }}

{{- define "diagnostic-agent-service.selectorLabels" -}}
app.kubernetes.io/name: diagnostic-agent-service
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
