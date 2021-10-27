terraform {
  required_providers {
    helm = {
      source = "hashicorp/helm"
      version = "2.3.0"
    }
  }
}


provider "helm" {
   kubernetes {
    host     = var.kubernetes_host 
    token    = var.kubernetes_token
    insecure = true
  }
}
