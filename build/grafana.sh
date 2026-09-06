echo "🚀 Updating Grafana Configuration complete"

export REACTORY_PROMETHEUS_URL=${REACTORY_PROMETHEUS_URL:-http://reactory-prometheus:9090}
export REACTORY_GRAFANA_URL=${REACTORY_GRAFANA_URL:-http://reactory-grafana:3000}
export REACTORY_JAEGER_URL=${REACTORY_JAEGER_URL:-http://reactory-jaeger:16686}
export REACTORY_MONGODB=${MONGO_URI:-reactory-mongodb:27017}
export REACTORY_POSTGRES_URL=${REACTORY_POSTGRES_URL:-reactory-postgres:5432}
export REACTORY_REDIS_URL=${REACTORY_REDIS_URL:-redis://reactory-redis:6379}
export REACTORY_REDIS_PASSWORD=${REACTORY_REDIS_PASSWORD:-reactorycore}
export REACTORY_MEILISEARCH=${REACTORY_MEILISEARCH:-http://reactory-meilisearch:7700}
export REACTORY_GRAFANA_LOKI_URL=${REACTORY_GRAFANA_LOKI_URL:-http://reactory-grafana-loki:3100}
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