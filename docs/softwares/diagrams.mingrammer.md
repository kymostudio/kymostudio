---
title: diagrams (mingrammer) — External Reference
document_id: REF-DIAGRAMS-MINGRAMMER-001
version: "1.1"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the `kymo` DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - ../formats/kymo-dsl/README.md
  - ../BEST_PRACTICE_DIAGRAMS.md
  - d2.md
  - figma.md
  - diagrams.mingrammer.comparision.md
authors:
  - Vũ Anh
language: en
keywords:
  - diagrams
  - mingrammer
  - diagram-as-code
  - python
  - graphviz
  - cloud-architecture
  - node-catalog
  - prior-art
upstream:
  project: mingrammer/diagrams
  homepage: https://diagrams.mingrammer.com/
  repository: https://github.com/mingrammer/diagrams
  license: MIT
  runtime: Python ≥ 3.7
  hard_dependency: Graphviz (system binary, `dot`)
  examples_page: https://diagrams.mingrammer.com/docs/getting-started/examples
  access_date: 2026-05-18
---

# diagrams (mingrammer) — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-DIAGRAMS-MINGRAMMER-001                                    |
| Version           | 1.1                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the `kymo` DSL, layout, or render pipeline   |
| Upstream          | [`mingrammer/diagrams`](https://github.com/mingrammer/diagrams) · [diagrams.mingrammer.com](https://diagrams.mingrammer.com/) |
| License           | MIT                                                            |
| Runtime           | Python ≥ 3.7 (CPython)                                         |
| Hard Dependency   | Graphviz (`dot` binary on `$PATH`)                             |
| Access Date       | 2026-05-18                                                     |
| Primary Source    | [Examples page](https://diagrams.mingrammer.com/docs/getting-started/examples) |
| Related Documents | [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md) (kymo comparison), [`d2.md`](d2.md), [`figma.md`](figma.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures the design choices in `mingrammer/diagrams` so the team can consult them when evolving kymo's DSL, layout, and render pipeline. No code or behavior in this repository depends on `diagrams`.

## 1. Overview

`diagrams` (often called *Diagrams as Code* in the Python community) lets engineers describe cloud system architecture **in Python** and renders the result through **Graphviz**. The upstream tagline is *"Diagrams lets you draw the cloud system architecture in Python code."* It is **not** a provisioning tool — it only emits images. Distinguishing properties versus other prior art in this repo:

- The DSL is **host-language Python**, not a separate text grammar. Diagrams are built by instantiating classes inside a `with Diagram(...)` context and connecting them with overloaded operators (`>>`, `<<`, `-`).
- The value proposition is the **node catalog**, not the layout engine. Every major cloud and platform ships as a sub-package of icons (`diagrams.aws.compute.EC2`, `diagrams.k8s.network.Ingress`, …). Layout is delegated to Graphviz's `dot`.
- Output is rasterised/vectorised by Graphviz: `png` (default), `jpg`, `svg`, `pdf`, `dot`.

## 2. Runtime and installation

- **Python**: 3.7 or higher.
- **Graphviz**: required system binary. Install separately (`brew install graphviz`, `choco install graphviz`, `winget install Graphviz.Graphviz -i`, etc.).
- **Package install** (any of):

  ```bash
  pip install diagrams
  pipenv install diagrams
  poetry add diagrams
  uv tool install diagrams
  ```

- **CLI**: `diagrams diagram1.py diagram2.py` runs one or more scripts in batch.
- **Quick start** (smallest possible diagram — generates `web_service.png` in cwd):

  ```python
  from diagrams import Diagram
  from diagrams.aws.compute import EC2
  from diagrams.aws.database import RDS
  from diagrams.aws.network import ELB

  with Diagram("Web Service", show=False):
      ELB("lb") >> EC2("web") >> RDS("userdb")
  ```

## 3. Core primitives

### 3.1 `Diagram`

Acts as a context manager and as the render driver. Selected constructor parameters:

| Parameter    | Purpose |
|--------------|---------|
| `name` (1st positional) | Title + default filename. |
| `filename`   | Override output filename (extension picked from `outformat`). |
| `outformat`  | `png` (default), `jpg`, `svg`, `pdf`, `dot`. Accepts a list to emit multiple at once. |
| `show`       | Auto-open the rendered file (default `True`). |
| `direction`  | `LR` (default), `TB`, `BT`, `RL`. |
| `graph_attr` / `node_attr` / `edge_attr` | Raw Graphviz attribute dicts passed through to `dot`. |

```python
graph_attr = {"fontsize": "45", "bgcolor": "transparent"}

with Diagram("Simple Diagram", show=False, graph_attr=graph_attr):
    EC2("web")

with Diagram("Simple Diagram Multi Output", outformat=["jpg", "png", "dot"]):
    EC2("web")
```

### 3.2 `Node` (provider catalog)

A node is `provider.category.ResourceType`. Providers shipped upstream include **AWS, Azure, GCP, IBM, OCI, OpenStack, AlibabaCloud, DigitalOcean, Kubernetes (`k8s`), Firebase, Elastic, OnPrem, Generic, Programming, SaaS, C4, Custom, GIS**.

```python
from diagrams.aws.compute import EC2
from diagrams.azure.storage import BlobStorage
from diagrams.k8s.compute import Pod
from diagrams.gcp.ml import AutoML
```

Connection operators are overloaded on `Node`:

| Operator | Meaning |
|----------|---------|
| `>>`     | Directed edge, left → right |
| `<<`     | Directed edge, right → left |
| `-`      | Undirected edge |

Lists fan out a connection to/from many nodes in one expression:

```python
ELB("lb") >> [EC2("worker1"), EC2("worker2"), EC2("worker3")] >> RDS("db")
```

Two limitations worth flagging when comparing against kymo:

1. **List-to-list edges are not allowed** — Python disallows the arithmetic operation between lists, so the user must chain through a singleton in between.
2. **Mixing `-` with `>>`/`<<`** requires explicit parentheses because of Python operator precedence.

### 3.3 `Cluster`

Groups nodes into a labeled box; implemented as a context manager and nestable to any depth.

```python
from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS
from diagrams.aws.database import RDS
from diagrams.aws.network import Route53

with Diagram("Simple Web Service with DB Cluster", show=False):
    dns = Route53("dns")
    web = ECS("service")

    with Cluster("DB Cluster"):
        db_primary = RDS("primary")
        db_primary - [RDS("replica1"),
                      RDS("replica2")]

    dns >> web >> db_primary
```

This is the closest construct to kymo's `region`/container model, but with a more lightweight surface (no nesting depth limit, no explicit keyword — just `with Cluster("name"):`).

### 3.4 `Edge`

Decorates a connection with Graphviz attributes (label, color, style, plus layout hints like `minlen`, `headport`). Used by `<<`/`>>`-ing the `Edge` between two nodes:

```python
from diagrams import Edge

metrics << Edge(color="firebrick", style="dashed") << Grafana("monitoring")
primary << Edge(label="collect") << metrics
aggregator >> Edge(label="parse") >> Kafka("stream") >> Edge(color="black", style="bold") >> Spark("analytics")
```

### 3.5 `Custom`

Allows arbitrary local image files (e.g. PNG icons not in the catalog) to act as nodes:

```python
from diagrams.custom import Custom
queue = Custom("Message queue", "rabbitmq.png")
```

## 4. Examples (verbatim from upstream)

The following are the nine examples published at <https://diagrams.mingrammer.com/docs/getting-started/examples> on the access date. They are reproduced unmodified for traceability; do not edit them in-place — fetch upstream again if they drift.

### 4.1 Grouped Workers on AWS

Load balancer fans out to a list of EC2 workers, which all write to one RDS instance. Showcases the list-fan-out idiom.

```python
from diagrams import Diagram
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB

with Diagram("Grouped Workers", show=False, direction="TB"):
    ELB("lb") >> [EC2("worker1"),
                  EC2("worker2"),
                  EC2("worker3"),
                  EC2("worker4"),
                  EC2("worker5")] >> RDS("events")
```

### 4.2 Clustered Web Services

DNS → ELB → clustered ECS services, with a primary/replica RDS cluster and a memcached cache. First example to combine `Cluster` with list fan-out and undirected (`-`) replication edges.

```python
from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS
from diagrams.aws.database import ElastiCache, RDS
from diagrams.aws.network import ELB
from diagrams.aws.network import Route53

with Diagram("Clustered Web Services", show=False):
    dns = Route53("dns")
    lb = ELB("lb")

    with Cluster("Services"):
        svc_group = [ECS("web1"),
                     ECS("web2"),
                     ECS("web3")]

    with Cluster("DB Cluster"):
        db_primary = RDS("userdb")
        db_primary - [RDS("userdb ro")]

    memcached = ElastiCache("memcached")

    dns >> lb >> svc_group
    svc_group >> db_primary
    svc_group >> memcached
```

### 4.3 Event Processing on AWS

EKS source → ECS workers → SQS queue → Lambda processors → S3 + Redshift. Demonstrates two-level `Cluster` nesting (`Event Flows` → `Event Workers` / `Processing`).

```python
from diagrams import Cluster, Diagram
from diagrams.aws.compute import ECS, EKS, Lambda
from diagrams.aws.database import Redshift
from diagrams.aws.integration import SQS
from diagrams.aws.storage import S3

with Diagram("Event Processing", show=False):
    source = EKS("k8s source")

    with Cluster("Event Flows"):
        with Cluster("Event Workers"):
            workers = [ECS("worker1"),
                       ECS("worker2"),
                       ECS("worker3")]

        queue = SQS("event queue")

        with Cluster("Processing"):
            handlers = [Lambda("proc1"),
                        Lambda("proc2"),
                        Lambda("proc3")]

    store = S3("events store")
    dw = Redshift("analytics")

    source >> workers >> queue >> handlers
    handlers >> store
    handlers >> dw
```

### 4.4 Message Collecting System on GCP

IoT Core → Pub/Sub → Dataflow → BigQuery / GCS / AppEngine / Functions. Three-level `Cluster` nesting and a fan-in from a list of IoT devices to a single PubSub node.

```python
from diagrams import Cluster, Diagram
from diagrams.gcp.analytics import BigQuery, Dataflow, PubSub
from diagrams.gcp.compute import AppEngine, Functions
from diagrams.gcp.database import BigTable
from diagrams.gcp.iot import IotCore
from diagrams.gcp.storage import GCS

with Diagram("Message Collecting", show=False):
    pubsub = PubSub("pubsub")

    with Cluster("Source of Data"):
        [IotCore("core1"),
         IotCore("core2"),
         IotCore("core3")] >> pubsub

    with Cluster("Targets"):
        with Cluster("Data Flow"):
            flow = Dataflow("data flow")

        with Cluster("Data Lake"):
            flow >> [BigQuery("bq"),
                     GCS("storage")]

        with Cluster("Event Driven"):
            with Cluster("Processing"):
                flow >> AppEngine("engine") >> BigTable("bigtable")

            with Cluster("Serverless"):
                flow >> Functions("func") >> AppEngine("appengine")

    pubsub >> flow
```

### 4.5 Exposed Pod with 3 Replicas on Kubernetes

Compact one-liner expressing ingress → service → 3 pods, with the reverse chain (`<<`) walking back through ReplicaSet → Deployment → HPA. The most concise demonstration of how operator-overloading replaces a verbose AST.

```python
from diagrams import Diagram
from diagrams.k8s.clusterconfig import HPA
from diagrams.k8s.compute import Deployment, Pod, ReplicaSet
from diagrams.k8s.network import Ingress, Service

with Diagram("Exposed Pod with 3 Replicas", show=False):
    net = Ingress("domain.com") >> Service("svc")
    net >> [Pod("pod1"),
            Pod("pod2"),
            Pod("pod3")] << ReplicaSet("rs") << Deployment("dp") << HPA("hpa")
```

### 4.6 Stateful Architecture on Kubernetes

StatefulSet pattern with PV/PVC/StorageClass. Notable for using a Python `for` loop to instantiate per-replica nodes — the DSL has no native repetition operator, so users reach back into host-language control flow.

```python
from diagrams import Cluster, Diagram
from diagrams.k8s.compute import Pod, StatefulSet
from diagrams.k8s.network import Service
from diagrams.k8s.storage import PV, PVC, StorageClass

with Diagram("Stateful Architecture", show=False):
    with Cluster("Apps"):
        svc = Service("svc")
        sts = StatefulSet("sts")

        apps = []
        for _ in range(3):
            pod = Pod("pod")
            pvc = PVC("pvc")
            pod - sts - pvc
            apps.append(svc >> pod >> pvc)

    apps << PV("pv") << StorageClass("sc")
```

### 4.7 Advanced Web Service with On-Premises

Larger composition: Nginx ingress, Prometheus/Grafana monitoring, gRPC service cluster, HA Redis sessions, HA PostgreSQL DB, Fluentd → Kafka → Spark analytics pipeline. Uses the `diagrams.onprem.*` catalog.

```python
from diagrams import Cluster, Diagram
from diagrams.onprem.analytics import Spark
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.aggregator import Fluentd
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.network import Nginx
from diagrams.onprem.queue import Kafka

with Diagram("Advanced Web Service with On-Premises", show=False):
    ingress = Nginx("ingress")

    metrics = Prometheus("metric")
    metrics << Grafana("monitoring")

    with Cluster("Service Cluster"):
        grpcsvc = [
            Server("grpc1"),
            Server("grpc2"),
            Server("grpc3")]

    with Cluster("Sessions HA"):
        primary = Redis("session")
        primary - Redis("replica") << metrics
        grpcsvc >> primary

    with Cluster("Database HA"):
        primary = PostgreSQL("users")
        primary - PostgreSQL("replica") << metrics
        grpcsvc >> primary

    aggregator = Fluentd("logging")
    aggregator >> Kafka("stream") >> Spark("analytics")

    ingress >> grpcsvc >> aggregator
```

### 4.8 Advanced Web Service with On-Premises (Colored)

Same topology as 4.7 but with `Edge(color=..., style=..., label=...)` decorations on every connection. This is the canonical example of edge styling in `diagrams`.

```python
from diagrams import Cluster, Diagram, Edge
from diagrams.onprem.analytics import Spark
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.aggregator import Fluentd
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.network import Nginx
from diagrams.onprem.queue import Kafka

with Diagram(name="Advanced Web Service with On-Premises (colored)", show=False):
    ingress = Nginx("ingress")

    metrics = Prometheus("metric")
    metrics << Edge(color="firebrick", style="dashed") << Grafana("monitoring")

    with Cluster("Service Cluster"):
        grpcsvc = [
            Server("grpc1"),
            Server("grpc2"),
            Server("grpc3")]

    with Cluster("Sessions HA"):
        primary = Redis("session")
        primary - Edge(color="brown", style="dashed") - Redis("replica") << Edge(label="collect") << metrics
        grpcsvc >> Edge(color="brown") >> primary

    with Cluster("Database HA"):
        primary = PostgreSQL("users")
        primary - Edge(color="brown", style="dotted") - PostgreSQL("replica") << Edge(label="collect") << metrics
        grpcsvc >> Edge(color="black") >> primary

    aggregator = Fluentd("logging")
    aggregator >> Edge(label="parse") >> Kafka("stream") >> Edge(color="black", style="bold") >> Spark("analytics")

    ingress >> Edge(color="darkgreen") << grpcsvc >> Edge(color="darkorange") >> aggregator
```

### 4.9 RabbitMQ Consumers with Custom Nodes

Pulls a PNG icon at runtime and uses `Custom` to render it as a node. The pattern any kymo user would need if kymo's icon catalog is incomplete.

```python
from urllib.request import urlretrieve

from diagrams import Cluster, Diagram
from diagrams.aws.database import Aurora
from diagrams.custom import Custom
from diagrams.k8s.compute import Pod

# Download an image to be used into a Custom Node class
rabbitmq_url = "https://jpadilla.github.io/rabbitmqapp/assets/img/icon.png"
rabbitmq_icon = "rabbitmq.png"
urlretrieve(rabbitmq_url, rabbitmq_icon)

with Diagram("Broker Consumers", show=False):
    with Cluster("Consumers"):
        consumers = [
            Pod("worker"),
            Pod("worker"),
            Pod("worker")]

    queue = Custom("Message queue", rabbitmq_icon)

    queue >> consumers >> Aurora("Database")
```

## 5. Comparison to kymo

The opinionated prior-art comparison — host-language vs. external DSL, layout ownership, catalog strategy, `Cluster` semantics, edge decoration, and open questions for kymo — lives in [`diagrams.mingrammer.comparision.md`](diagrams.mingrammer.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream `diagrams` has not moved).

## 6. Provenance

- Primary source: <https://diagrams.mingrammer.com/docs/getting-started/examples>
- Supplementary: `/docs/getting-started/installation`, `/docs/guides/diagram`, `/docs/guides/node`, `/docs/guides/cluster`, `/docs/guides/edge` on the same host.
- All example code in §4 is reproduced verbatim from the upstream examples page; the surrounding prose is summary by the authors of this reference. Re-fetch upstream before editing — do not silently drift.
