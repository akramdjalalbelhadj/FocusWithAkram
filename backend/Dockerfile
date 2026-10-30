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
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD ["sh", "-c", "wget -qO- http://127.0.0.1:8080/actuator/health | grep -q UP || exit 1"]
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
