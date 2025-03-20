echo "🚀 Updating Grafana Configuration complete"

export PROMETHEUS_URL=${REACTORY_PROMETHEUS_URL:-localhost:9090}
export GRAFANA_URL=${REACTORY_GRAFANA_URL:-localhost:3001}
export JAEGER_URL=${REACTORY_JAEGER_URL:-localhost:16686}
export REACTORY_MONGODB=${MONGO_URI:-localhost:27017}
export REACTORY_POSTGRES_URL=${REACTORY_POSTGRES_URL:-postgresql://localhost:5432/reactory}
export REACTORY_REDIS_URL=${REACTORY_REDIS_URL:-localhost:6379}
export REACTORY_REDIS_PASSWORD=${REACTORY_REDIS_PASSWORD:-reactory}
export REACTORY_MEILISEARCH=${REACTORY_MEILISEARCH:-localhost:7700}
export REACTORY_EXPRESS_SERVER=${REACTORY_SERVER_URL:-localhost:3000}
export REACTORY_GRAFANA_LOKI_URL=${REACTORY_GRAFANA_LOKI_URL:-localhost:3100}
export REACTORY_PROMETHEUS_URL=${REACTORY_PROMETHEUS_URL:-localhost:9090}
export REACTORY_GRAFANA_URL=${REACTORY_GRAFANA_URL:-localhost:3001}
export REACTORY_JAEGER_URL=${REACTORY_JAEGER_URL:-localhost:16686}
export REACTORY_MONGO_USERNAME=${MONGO_USER:-reactory}
export REACTORY_MONGO_PASSWORD=${MONGO_PASSWORD:-reactory}

envsubst < $REACTORY_SERVER/src/modules/reactory-telemetry/data/grafana/provisioning/datasources/reactory-sources.yml.templ > $REACTORY_SERVER/src/modules/reactory-telemetry/data/grafana/provisioning/datasources/reactory-sources.yml

# check if yamllint is installed
if ! command -v yamllint &> /dev/null
then
    echo "🚀 Warning: yamllint could not be found. Install in order to validate outputs"
else
    LINTFILE=$REACTORY_SERVER/src/modules/reactory-telemetry/build/.yamllint
    FILENAME=$REACTORY_SERVER/src/modules/reactory-telemetry/data/grafana/provisioning/datasources/reactory-sources.yml
    yamllint -c $LINTFILE $FILENAME
    # check if the yamllint command failed
    if [ $? -ne 0 ]; then
        echo "🚩 Error: yamllint failed to validate $FILENAME"
        exit 1
    else
        echo "🚀 $FILENAME file is valid"
    fi

    FILENAME=$REACTORY_SERVER/src/modules/reactory-telemetry/data/grafana/provisioning/dashboards/reactory-graph.yml
    yamllint -c $LINTFILE $FILENAME

    # check if the yamllint command failed
    if [ $? -ne 0 ]; then
        echo "🚩 Error: yamllint failed to validate $FILENAME"
        exit 1
    else
        echo "🚀 $FILENAME file is valid"
    fi
fi

echo "🚀 Updating Grafana Configuration complete"