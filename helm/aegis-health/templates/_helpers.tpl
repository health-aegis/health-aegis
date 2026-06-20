{{/*
Common labels applied to every object.
*/}}
{{- define "aegis.labels" -}}
app.kubernetes.io/part-of: aegis-health
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/*
Fully-qualified image reference for a given repository name.
Usage: {{ include "aegis.image" (dict "root" $ "repo" "api-gateway") }}
*/}}
{{- define "aegis.image" -}}
{{- $root := .root -}}
{{- if $root.Values.global.acrLoginServer -}}
{{- printf "%s/%s:%s" $root.Values.global.acrLoginServer .repo $root.Values.global.imageTag -}}
{{- else -}}
{{- printf "%s:%s" .repo $root.Values.global.imageTag -}}
{{- end -}}
{{- end -}}

{{/*
The K8s Secret + ConfigMap envFrom block shared by all backend workloads.
*/}}
{{- define "aegis.envFrom" -}}
envFrom:
  - secretRef:
      name: {{ .Values.secretName }}
  - configMapRef:
      name: aegis-config
{{- end -}}

{{/*
The CSI secrets-store volume mount + volume shared by all backend workloads.
Renders nothing extra — caller places under containers/volumeMounts and volumes.
*/}}
