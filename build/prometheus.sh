#!/bin/bash
noProtocol() {
  echo $1 | sed -e 's/^http[s]*:\/\///'
}

export PROMETHEUS_URL=$(noProtocol ${REACTORY_PROMETHEUS_URL:-localhost:9090})
export GRAFANA_URL=$(noProtocol ${REACTORY_GRAFANA_URL:-localhost:3001})
export JAEGER_URL=$(noProtocol ${REACTORY_JAEGER_URL:-localhost:16686})
export REACTORY_MONGODB=$(noProtocol ${MONGO_URI:-localhost:27017})
export REACTORY_POSTGRES_URL=$(noProtocol ${REACTORY_POSTGRES_URL:-postgresql://localhost:5432/reactory})
export REACTORY_REDIS_URL=$(noProtocol ${REACTORY_REDIS_URL:-localhost:6379})
export REACTORY_REDIS_PASSWORD=${REACTORY_REDIS_PASSWORD:-reactory}
export REACTORY_MEILISEARCH=$(noProtocol ${REACTORY_MEILISEARCH:-localhost:7700})
export REACTORY_EXPRESS_SERVER=$(noProtocol ${REACTORY_SERVER_URL:-localhost:3000})
export REACTORY_GRAFANA_LOKI_URL=$(noProtocol ${REACTORY_GRAFANA_LOKI_URL:-localhost:3100})
export REACTORY_PROMETHEUS_URL=$(noProtocol ${REACTORY_PROMETHEUS_URL:-localhost:9090})
export REACTORY_GRAFANA_URL=$(noProtocol ${REACTORY_GRAFANA_URL:-localhost:3001})
export REACTORY_JAEGER_URL=$(noProtocol ${REACTORY_JAEGER_URL:-localhost:16686})
export REACTORY_MONGO_USERNAME=${MONGO_USER:-reactory}
export REACTORY_MONGO_PASSWORD=${MONGO_PASSWORD:-reactory}

envsubst < $REACTORY_SERVER/src/modules/reactory-telemetry/data/prometheus/prometheus.yml.templ > $REACTORY_SERVER/src/modules/reactory-telemetry/data/prometheus/prometheus.yml

# check if yamllint is installed
if ! command -v yamllint &> /dev/null
then
    echo "🚀 Warning: yamllint could not be found. Install in order to validate outputs"
else
    yamllint -c $REACTORY_SERVER/src/modules/reactory-telemetry/build/.yamllint  $REACTORY_SERVER/src/modules/reactory-telemetry/data/prometheus/prometheus.yml
    # check if the yamllint command failed
    if [ $? -ne 0 ]; then
        echo "🚀 Warning: yamllint failed to validate the prometheus.yml file"
    else
        echo "🚀 prometheus.yml file is valid"
    fi
fi

echo "🚀 Updating Prometheus Configuration complete"