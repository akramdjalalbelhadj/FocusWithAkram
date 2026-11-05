# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -B dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -B -DskipTests package

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 focusflow
WORKDIR /app
COPY --from=build /build/target/focusflow.jar app.jar
USER focusflow
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75" \
    FOCUSFLOW_BIND_ADDRESS=0.0.0.0
EXPOSE 8080
# L'image eclipse-temurin:25-jre n'a ni wget ni curl : requete HTTP par /dev/tcp de bash (present dans l'image).
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /actuator/health HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && grep -q '\"UP\"' <&3"]
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
