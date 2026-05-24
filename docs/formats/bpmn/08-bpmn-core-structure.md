---
title: "BPMN 2.0.2 — Clause 8: BPMN Core Structure"
document_id: BPMN-NREF-CORE-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (Events, Gateways, Activities)
  - BPMN-NREF-COLLAB-001   # Clause 9 — Collaboration (Message, Correlation use)
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats (XSD)
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - core
  - metamodel
  - definitions
  - foundation
  - common-elements
  - correlation
  - services
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Clause 8: BPMN Core Structure

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-CORE-001                                         |
| Version           | 1.4                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Source            | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§8 BPMN Core Structure** (pp.47–106) / ISO/IEC 19510:2013 |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-PROCESS-001`, `BPMN-NREF-COLLAB-001`, `BPMN-NREF-EXCHANGE-001`, `REF-BPMN-001` |

## 8.1 General (p.47)

> **NOTE:** The content of this clause is REQUIRED for **all** BPMN conformance types. For more
> information about BPMN conformance types, see Clause 1 (Scope).

The technical structuring of BPMN is based on the concept of **extensibility layers** on top of
a basic series of simple elements identified as **Core Elements** of the International Standard.
From this core set of constructs, layering is used to describe additional elements that extend
and add new constructs to the International Standard and relies on clear dependency paths for
resolution. The XML Schema model lends itself particularly well to the structuring model with
formalized import and resolution mechanics that remove ambiguities in the definitions of
elements in the outer layers of the International Standard.

*Figure 8.1 — A representation of the BPMN Core and Layer Structure.* The **BPMN Core** is
wrapped by the **Infrastructure**, **Common Elements**, and **Services** sub-packages, which are
in turn surrounded by the layers **Collaboration**, **Conversations**, **Choreography**,
**Activities**, **Data**, **Process**, and **Human**.

Layering can be composed in well-defined ways; the approach uses formalization constructs for
extensibility that are applied consistently to the definition. The additional effect of layering
is that **compatibility layers** can be built, allowing for different levels of compliance among
vendors, and enabling vendors to add their own layers in support of vertical industries or target
audiences. It also provides a mechanism for the redefinition of previously existing concepts
without affecting backwards compatibility.

The BPMN International Standard is structured in layers, where each layer builds on top of and
extends lower layers. Included is a **Core** or kernel that includes the most fundamental elements
of BPMN, which are REQUIRED for constructing BPMN diagrams: **Process**, **Choreography**, and
**Collaboration**. The Core is intended to be simple, concise, and extendable with well-defined
behavior.

The Core contains four sub-packages (*Figure 8.2 — Class diagram showing the core packages*; to
simplify the diagram, the Infrastructure package is not shown):

1. **Infrastructure** — two elements that are used for both abstract syntax models and diagram models.
2. **Foundation** — the fundamental constructs needed for BPMN modeling.
3. **Service** — the fundamental constructs needed for modeling services and interfaces.
4. **Common** — those classes which are common to the layers of **Process**, **Choreography**, and
   **Collaboration**.

*Figure 8.3 — Class diagram showing the organization of the core BPMN elements.*

## 8.2 Infrastructure (pp.49–53)

The BPMN Infrastructure package contains two elements that are used for both abstract syntax
models and diagram models.

### 8.2.1 Definitions (p.49)

The `Definitions` class is the outermost containing object for all BPMN elements. It defines the
scope of visibility and the namespace for all contained elements. The interchange of BPMN files
will always be through one or more `Definitions` (*Figure 8.4 — Definitions class diagram*).

The `Definitions` element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.1 — Definitions attributes and model association**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | The name of the `Definition`. |
| **targetNamespace**: string | Identifies the namespace associated with the `Definition` and follows the convention established by XML Schema. |
| **expressionLanguage**: string [0..1] | Identifies the formal `Expression` language used in `Expressions` within the elements of this `Definition`. The default is `http://www.w3.org/1999/XPath`. This value MAY be overridden on each individual formal `Expression`. The language MUST be specified in a URI format. |
| **typeLanguage**: string [0..1] | Identifies the type system used by the elements of this `Definition`. Defaults to `http://www.w3.org/2001/XMLSchema`. This value can be overridden on each individual `ItemDefinition`. The language MUST be specified in a URI format. |
| **rootElements**: RootElement [0..*] | Lists the root elements that are at the root of this `Definitions`. These elements can be referenced within this `Definitions` and are visible to other `Definitions`. |
| **diagrams**: BPMNDiagram [0..*] | Lists the `BPMNDiagrams` that are contained within this `Definitions` (see Clause 12). |
| **imports**: Import [0..*] | Used to import externally defined elements and make them available for use by elements within this `Definitions`. |
| **extensions**: Extension [0..*] | Identifies `extensions` beyond the attributes and model associations in the base BPMN International Standard (see §8.3.3). |
| **relationships**: Relationship [0..*] | Enables the extension and integration of BPMN models into larger system/development `Processes`. |
| **exporter**: string [0..1] | Identifies the tool that is exporting the bpmn model file. |
| **exporterVersion**: string [0..1] | Identifies the version of the tool that is exporting the bpmn model file. |

### 8.2.2 Import (p.51)

The `Import` class is used when referencing an external element, either BPMN elements contained
in other BPMN `Definitions` or non-BPMN elements. `Imports` MUST be explicitly defined.

**Table 8.2 — Import attributes**

| Attribute Name | Description/Usage |
|---|---|
| **importType**: string | Identifies the type of document being imported by providing an absolute URI that identifies the encoding language used in the document. The value of the `importType` attribute MUST be set to `http://www.w3.org/2001/XMLSchema` when importing XML Schema 1.0 documents, to `http://www.w3.org/TR/wsdl20/` when importing WSDL 2.0 documents, and `http://www.omg.org/spec/BPMN/20100524/MODEL` when importing BPMN 2.0 documents. Other types of documents MAY be supported. Importing XML Schema 1.0, WSDL 2.0, and BPMN 2.0 types MUST be supported. |
| **location**: string [0..1] | Identifies the location of the imported element. |
| **namespace**: string | Identifies the namespace of the imported element. |

### 8.2.3 Infrastructure Package XML Schemas (p.52)

**Table 8.3 — Definitions XML schema**

```xml
<xsd:element name="definitions" type="tDefinitions"/>
<xsd:complexType name="tDefinitions">
    <xsd:sequence>
        <xsd:element ref="import" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="extension" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="rootElement" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="bpmndi:BPMNDiagram" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="relationship" minOccurs="0" maxOccurs="unbounded"/>
    </xsd:sequence>
    <xsd:attribute name="id" type="xsd:ID" use="optional"/>
    <xsd:attribute name="targetNamespace" type="xsd:anyURI" use="required"/>
    <xsd:attribute name="expressionLanguage" type="xsd:anyURI" use="optional" default="http://www.w3.org/1999/XPath"/>
    <xsd:attribute name="typeLanguage" type="xsd:anyURI" use="optional" default="http://www.w3.org/2001/XMLSchema"/>
    <xsd:anyAttribute name="exporter" type="xsd:ID"/>
    <xsd:anyAttribute name="exporterVersion" type="xsd:ID"/>
    <xsd:anyAttribute namespace="##other" processContents="lax"/>
</xsd:complexType>
```

**Table 8.4 — Import XML schema**

```xml
<xsd:element name="import" type="tImport"/>
<xsd:complexType name="tImport">
    <xsd:attribute name="namespace" type="xsd:anyURI" use="required"/>
    <xsd:attribute name="location" type="xsd:string" use="required"/>
    <xsd:attribute name="importType" type="xsd:anyURI" use="required"/>
</xsd:complexType>
```

## 8.3 Foundation (pp.53–63)

The `Foundation` package contains classes that are shared among other packages in the Core
(*Figure 8.5 — Classes in the Foundation package*) of an abstract syntax model.

### 8.3.1 Base Element (p.54)

`BaseElement` is the abstract super class for most BPMN elements. It provides the attributes `id`
and `documentation`, which other elements will inherit.

**Table 8.5 — BaseElement attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **id**: string | Used to uniquely identify BPMN elements. The `id` is REQUIRED if this element is referenced or intended to be referenced by something else. If the element is not currently referenced and is never intended to be referenced, the `id` MAY be omitted. |
| **documentation**: Documentation [0..*] | Used to annotate the BPMN element, such as descriptions and other documentation. |
| **extensionDefinitions**: ExtensionDefinition [0..*] | Attaches additional attributes and associations to any `BaseElement`. Not applicable when XML schema interchange is used, since the XSD mechanisms for supporting `anyAttribute` and any element already satisfy this requirement (see §8.3.3). |
| **extensionValues**: ExtensionAttributeValue [0..*] | Provides values for extended attributes and model associations. Not applicable when XML schema interchange is used (XSD `anyAttribute`/any element satisfy this). |

### 8.3.2 Documentation (p.54)

All BPMN elements that inherit from the `BaseElement` will have the capability, through the
`Documentation` element, to have one (1) or more text descriptions of that element. The
`Documentation` element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.6 — Documentation attributes**

| Attribute Name | Description/Usage |
|---|---|
| **text**: string | Captures the text descriptions of a BPMN element. |
| **textFormat**: string | Identifies the format of the text. It MUST follow the mime-type format. The default is `text/plain`. |

In the BPMN schema, the `tDocumentation` complexType does not contain a text attribute or
element. Instead, the documentation text is expected to appear in the body of the documentation
element. For example:

```xml
<documentation>An example of how the documentation text is entered.</documentation>
```

### 8.3.3 Extensibility (p.55)

The BPMN metamodel is aimed to be extensible. This allows BPMN adopters to extend the specified
metamodel in a way that allows them to be still BPMN-compliant. It provides a set of extension
elements, which allows BPMN adopters to attach additional attributes and elements to standard and
existing BPMN elements. This approach results in more interchangeable models, because the standard
elements are still intact and can still be understood by other BPMN adopters. It is only the
additional attributes and elements that MAY be lost during interchange.

A BPMN Extension basically consists of four different elements (*Figure 8.6 — Extension class
diagram*): **Extension**, **ExtensionDefinition**, **ExtensionAttributeDefinition**, and
**ExtensionAttributeValue**.

The core elements of an Extension are the `ExtensionDefinition` and `ExtensionAttributeDefinition`.
The latter defines a list of attributes that can be attached to any BPMN element; the attribute
list defines the name and type of the new attribute. The `ExtensionDefinition` itself can be
created independent of any BPMN element or definition. In order to use an `ExtensionDefinition`
within a BPMN model definition (`Definitions` element), the `ExtensionDefinition` MUST be
associated with an `Extension` element that binds it to a specific BPMN model definition. The
`Extension` element itself is contained within the `Definitions` element. Every "extended" BPMN
element contains the actual extension attribute value (`ExtensionAttributeValue`, of type
`Element`).

#### Extension

The `Extension` element binds/imports an `ExtensionDefinition` and its attributes to a BPMN model
definition.

**Table 8.7 — Extension attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **mustUnderstand**: boolean [0..1] = False | Defines if the semantics defined by the extension definition and its attribute definition MUST be understood by the BPMN adopter in order to process the BPMN model correctly. Defaults to False. |
| **definition**: ExtensionDefinition | Defines the content of the extension. Note that in the XML schema, this definition is provided by an external XML schema file and is simply referenced by QName. |

#### ExtensionDefinition

The `ExtensionDefinition` class defines and groups additional attributes. This type is not
applicable when the XML schema interchange is used, since XSD Complex Types already satisfy this
requirement.

**Table 8.8 — ExtensionDefinition attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | The name of the extension. This is used as a namespace to uniquely identify the extension content. |
| **extensionAttributeDefinitions**: ExtensionAttributeDefinition [0..*] | The specific attributes that make up the extension. |

#### ExtensionAttributeDefinition

The `ExtensionAttributeDefinition` defines new attributes. This type is not applicable when the
XML schema interchange is used (XSD "AnyAttribute"/"Any" type already satisfy this requirement).

**Table 8.9 — ExtensionAttributeDefinition attributes**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | The `name` of the extension attribute. |
| **type**: string | The type that is associated with the attribute. |
| **isReference**: boolean [0..1] = False | Indicates if the attribute value will be referenced or contained. |

#### ExtensionAttributeValue

The `ExtensionAttributeValue` contains the attribute value. This type is not applicable when the
XML schema interchange is used.

**Table 8.10 — ExtensionAttributeValue model associations**

| Attribute Name | Description/Usage |
|---|---|
| **value**: [Element 0..1] | The contained attribute value, used when the associated `ExtensionAttributeDefinition.isReference` is false. The type of this `Element` MUST conform to the type specified in the associated `ExtensionAttributeDefinition`. |
| **valueRef**: [Element 0..1] | The referenced attribute value, used when the associated `ExtensionAttributeDefinition.isReference` is true. The type of this `Element` MUST conform to the type specified in the associated `ExtensionAttributeDefinition`. |
| **extensionAttributeDefinition**: ExtensionAttributeDefinition | Defines the extension attribute for which this value is being provided. |

#### Extensibility XML Schemas

**Table 8.11 — Extension XML schema**

```xml
<xsd:element name="extension" type="tExtension"/>
<xsd:complexType name="tExtension">
    <xsd:sequence>
        <xsd:element ref="documentation" minOccurs="0" maxOccurs="unbounded"/>
    </xsd:sequence>
    <xsd:attribute name="definition" type="xsd:QName"/>
    <xsd:attribute name="mustUnderstand" type="xsd:boolean" use="optional"/>
</xsd:complexType>
```

**XML Example.** This example shows a **Task**, defined the BPMN Core, being extended with Inputs
and Outputs defined outside of the Core.

**Table 8.12 — Example Core XML schema**

```xml
<xsd:schema …>
        …
    <xsd:element name="task" type="tTask"/>
    <xsd:complexType name="tTask">
        <xsd:complexContent>
            <xsd:extension base="tActivity"/>
        </xsd:complexContent>
    </xsd:complexType>
        …
</xsd:schema>
```

**Table 8.13 — Example Extension XML schema**

```xml
<xsd:schema …>
        …
    <xsd:group name="dataRequirements">
        <xsd:sequence>
            <xsd:element ref="dataInput" minOccurs="0" maxOccurs="unbounded" />
            <xsd:element ref="dataOutput" minOccurs="0" maxOccurs="unbounded" />
            <xsd:element ref="inputSet" minOccurs="0" maxOccurs="unbounded" />
            <xsd:element ref="outputSet" minOccurs="0" maxOccurs="unbounded" />
        </xsd:sequence>
    </xsd:group>
        …
</xsd:schema>
```

**Table 8.14 — Sample XML instance**

```xml
<bpmn:definitions id="ID_1" …>
        …
    <bpmn:extension mustUnderstand="true" definition="bpmn:dataRequirements"/>
        …
    <bpmn:task name="Retrieve Customer Record" id="ID_2">
        <bpmn:dataInput name="Order Input" id="ID_3">
            <bpmn:typeDefinition typeRef="bo:Order" id="ID_4"/>
        </bpmn:dataInput>
        <bpmn:dataOutput name="Customer Record Output" id="ID_5">
            <bpmn:typeDefinition typeRef="bo:CustomerRecord" id="ID_6"/>
        </bpmn:dataOutput>
        <bpmn:inputSet name="Inputs" id="ID_7" dataInputRefs="ID_3"/>
        <bpmn:outputSet name="Outputs" id="ID_8" dataOutputRefs="ID_5"/>
    </bpmn:task>
        …
</bpmn:definitions>
```

### 8.3.4 External Relationships (pp.59–61)

It is the intention of this International Standard to cover the basic elements necessary for the
construction of semantically rich and syntactically valid **Process** models. Extension
capabilities enable the enrichment of the information described in BPMN. The intention of the
`Relationship` element is to enable BPMN `Artifacts` to be integrated into larger development
**Processes** via the specification of a non-intrusive identity/relationship model between BPMN
`Artifacts` and elements expressed in any other addressable domain model. By defining
"relationship types" that can be associated with elements in the BPMN `Artifacts` and arbitrary
elements in a given addressable domain model, it enables the extension and integration of BPMN
models into larger system/development **Processes** (e.g., a UML use case could be related to a
**Process** element without affecting the nature of the `Artifacts` themselves).

*Figure 8.7 — External Relationship Metamodel.* The `Relationship` element inherits the attributes
and model associations of `BaseElement` (Table 8.5).

**Table 8.15 — Relationship attributes**

| Attribute Name | Description/Usage |
|---|---|
| **type**: string | The descriptive name of the element. |
| **direction**: RelationshipDirection {None \| Forward \| Backward \| Both} | Specifies the direction of the relationship. |
| **sources**: [Element 1..*] | Defines artifacts that are augmented by the relationship. |
| **targets**: [Element 1..*] | Defines artifacts used to extend the semantics of the source element(s). |

**Table 8.16 — Reengineer XML schema** (example: a "reengineer" relationship between a Visio™
artifact and a BPMN `Artifact`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions targetNamespace=""
    typeLanguage="" id="a123" expressionLanguage=""
    xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL Core-Common.xsd"
    xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:src="http://www.example.org/Processes/Old"
    xmlns:tgt="http://www.example.org/Processes/New">

    <import importType="http://office.microsoft.com/visio" location="OrderConfirmationProcess.vsd"
            namespace="http://www.example.org/Processes/Old"/>
    <import importType="http://www.omg.org/spec/BPMN/20100524/MODEL"
            location="OrderConfirmationProcess.xml"
            namespace="http://www.example.org/Processes/New"/>

    <relationship type="reengineered" id="a234" direction="both">
        <documentation>An as-is and to-be relationship. The as-is model is expressed as a Visio
            diagram. The re-engineered process has been split in two and is captured in BPMN 2.0
            format.</documentation>
        <source ref="src:OrderConfirmation"/>
        <target ref="tgt:OrderConfirmation_PartI"/>
        <target ref="tgt:OrderConfirmation_PartII"/>
    </relationship>
</definitions>
```

### 8.3.5 Root Element (p.62)

`RootElement` is the abstract super class for all BPMN elements that are contained within
`Definitions`. When contained within `Definitions`, these elements have their own defined
life-cycle and are not deleted with the deletion of other elements. Examples of concrete
`RootElements` include **Collaboration**, **Process**, and **Choreography**. Depending on their
use, `RootElements` can be referenced by multiple other elements (i.e., they can be reused). Some
`RootElements` MAY be contained within other elements instead of `Definitions`. This is done to
avoid the maintenance overhead of an independent life-cycle. For example, an `EventDefinition`
would be contained in a **Process** since it is used only there. In this case the
`EventDefinition` would be dependent on the tool life-cycle of the **Process**.

The `RootElement` element inherits the attributes and model associations of `BaseElement`
(Table 8.5), but does not have any further attributes or model associations.

### 8.3.6 Foundation Package XML Schemas (pp.62–63)

**Table 8.17 — BaseElement XML schema**

```xml
<xsd:element name="baseElement" type="tBaseElement"/>
<xsd:complexType name="tBaseElement" abstract="true">
    <xsd:sequence>
        <xsd:element ref="documentation" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="extensionElements" minOccurs="0" maxOccurs="1"/>
    </xsd:sequence>
    <xsd:attribute name="id" type="xsd:ID" use="optional"/>
    <xsd:anyAttribute namespace="##other" processContents="lax"/>
</xsd:complexType>

<xsd:element name="baseElementWithMixedContent" type="tBaseElementWithMixedContent"/>
<xsd:complexType name="tBaseElementWithMixedContent" abstract="true" mixed="true">
    <xsd:sequence>
        <xsd:element ref="documentation" minOccurs="0" maxOccurs="unbounded"/>
        <xsd:element ref="extensionElements" minOccurs="0" maxOccurs="1"/>
    </xsd:sequence>
    <xsd:attribute name="id" type="xsd:ID" use="optional"/>
    <xsd:anyAttribute namespace="##other" processContents="lax"/>
</xsd:complexType>

<xsd:element name="extensionElements" type="tExtensionElements"/>
<xsd:complexType name="tExtensionElements">
    <xsd:sequence>
        <xsd:any namespace="##any" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
    </xsd:sequence>
</xsd:complexType>

<xsd:element name="documentation" type="tDocumentation"/>
<xsd:complexType name="tDocumentation" mixed="true">
    <xsd:sequence>
        <xsd:any namespace="##any" processContents="lax" minOccurs="0"/>
    </xsd:sequence>
    <xsd:attribute name="id" type="xsd:ID" use="optional"/>
    <xsd:attribute name="textFormat" type="xsd:string" default="text/plain"/>
</xsd:complexType>
```

**Table 8.18 — RootElement XML schema**

```xml
<xsd:element name="rootElement" type="tRootElement"/>
<xsd:complexType name="tRootElement" abstract="true">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement"/>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.19 — Relationship XML schema**

```xml
<xsd:element name="relationship" type="tRelationship"/>
<xsd:complexType name="tRelationship">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="source" type="xsd:QName" minOccurs="1" maxOccurs="unbounded"/>
                <xsd:element name="target" type="xsd:QName" minOccurs="1" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="type" type="xsd:string" use="required"/>
            <xsd:attribute name="direction" type="tRelationshipDirection"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>

<xsd:simpleType name="tRelationshipDirection">
    <xsd:restriction base="xsd:string">
        <xsd:enumeration value="None"/>
        <xsd:enumeration value="Forward"/>
        <xsd:enumeration value="Backward"/>
        <xsd:enumeration value="Both"/>
    </xsd:restriction>
</xsd:simpleType>
```

## 8.4 Common Elements (pp.64–101)

The following sub clauses define BPMN elements that MAY be used in more than one type of diagram
(e.g., **Process**, **Collaboration**, and **Choreography**).

### 8.4.1 Artifacts (pp.64–71)

BPMN provides modelers with the capability of showing additional information about a **Process**
that is not directly related to the **Sequence Flows** or **Message Flows** of the Process. At
this point, BPMN provides three standard `Artifacts`: **Associations**, **Groups**, and **Text
Annotations**. Additional `Artifacts` MAY be added in later versions. A modeler or modeling tool
MAY extend a BPMN diagram and add new types of `Artifacts`; any new `Artifact` MUST follow the
**Sequence Flow** and **Message Flow** connection rules (below). **Associations** can be used to
link `Artifacts` to `Flow Objects`.

*Figure 8.8 — Artifacts Metamodel.* When an `Artifact` is defined it is contained within a
**Collaboration** or a `FlowElementsContainer` (a **Process** or **Choreography**).

#### Common Artifact Definitions

**Artifact Sequence Flow Connections** — see "Sequence Flow Connections Rules" (§7.6.1) for the
entire set of objects and how they MAY be source or targets of a **Sequence Flow**.

- An `Artifact` MUST NOT be a target for a **Sequence Flow**.
- An `Artifact` MUST NOT be a source for a **Sequence Flow**.

**Artifact Message Flow Connections** — see "Message Flow Connection Rules" (§7.6.2).

- An `Artifact` MUST NOT be a target for a **Message Flow**.
- An `Artifact` MUST NOT be a source for a **Message Flow**.

#### Association

An **Association** is used to associate information and `Artifacts` with `Flow Objects`. Text and
graphical non-`Flow Objects` can be associated with the `Flow Objects` and Flow. An **Association**
is also used to show the **Activity** used for *compensation* (see §10.7).

- An **Association** is a line that MUST be drawn with a dotted single line (*Figure 8.9*).
- The use of text, color, size, and lines for an **Association** MUST follow the rules defined in
  "Use of Text, Color, Size, and Lines in a Diagram" (§7.5).

*Figure 8.10 — The Association Class Diagram.* If there is a reason to put directionality on the
**Association** then a line arrowhead MAY be added (*Figure 8.11 — A Directional Association*); the
directionality can be in one (1) direction or in both directions.

Note that directional **Associations** were used in BPMN 1.2 to show how **Data Objects** were
inputs or outputs to **Activities**. In BPMN 2.0.2, a **Data Association** connector is used to
show inputs and outputs (see §10.4); a Data Association uses the same notation as a directed
**Association**. An **Association** is used to connect user-defined text (an **Annotation**) with a
`Flow Object` (*Figure 8.12 — An Association of Text Annotation*).

The **Association** element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.20 — Association attributes and model associations**

| Attributes | Description |
|---|---|
| **associationDirection**: AssociationDirection = None {None \| One \| Both} | Defines whether or not the Association shows any directionality with an arrowhead. The default is `None` (no arrowhead). A value of `One` means that the arrowhead SHALL be at the Target Object. A value of `Both` means that there SHALL be an arrowhead at both ends of the Association line. |
| **sourceRef**: BaseElement | The `BaseElement` that the **Association** is connecting from. |
| **targetRef**: BaseElement | The `BaseElement` that the **Association** is connecting to. |

#### Group

The **Group** object is an `Artifact` that provides a visual mechanism to group elements of a
diagram informally. The grouping is tied to the `CategoryValue` supporting element. That is, a
**Group** is a visual depiction of a single `CategoryValue`. The graphical elements within the
**Group** will be assigned the `CategoryValue` of the **Group**. (NOTE — `CategoryValues` can be
highlighted through other mechanisms, such as color, as defined by a modeler or a modeling tool.)

- A **Group** is a rounded corner rectangle that MUST be drawn with a solid dashed line
  (*Figure 8.13 — A Group Artifact*).
- The use of text, color, size, and lines for a **Group** MUST follow the rules defined in §7.5.

As an `Artifact`, a **Group** is not an **Activity** or any `Flow Object`, and therefore cannot
connect to **Sequence Flows** or **Message Flows**. In addition, **Groups** are not constrained by
restrictions of **Pools** and **Lanes**. This means that a **Group** can stretch across the
boundaries of a **Pool** to surround **Diagram** elements (*Figure 8.14 — A Group around Activities
in different Pools*), often to identify **Activities** that exist within a distributed
business-to-business transaction. **Groups** are often used to highlight certain sub clauses of a
Diagram without adding additional constraints for performance, as a **Sub-Process** would. The
highlighted (grouped) sub clause of the Diagram can be separated for reporting and analysis
purposes. **Groups** do not affect the flow of the `Process`.

*Figure 8.15 — The Group class diagram.* The **Group** element inherits the attributes and model
associations of `BaseElement` (Table 8.5), through its relationship to `Artifact`.

**Table 8.21 — Group model associations**

| Attributes | Description |
|---|---|
| **categoryValueRef**: CategoryValue [0..1] | Specifies the `CategoryValue` that the **Group** represents. The name of the `Category` and the value of the `CategoryValue` separated by delineator "." provides the label for the **Group**. The graphical elements within the boundaries of the **Group** will be assigned the `CategoryValue`. |

#### Category

`Categories`, which have user-defined semantics, can be used for documentation or analysis purposes
(e.g., `FlowElements` can be categorized as being customer oriented vs. support oriented;
furthermore, the cost and time of **Activities** per `Category` can be calculated). **Groups** are
one way in which `Categories` of objects can be visually displayed on the diagram. The `Category`
element inherits the attributes and model associations of `BaseElement` (Table 8.5) through its
relationship to `RootElement`.

**Table 8.22 — Category model associations**

| Attributes | Description |
|---|---|
| **name**: string | The descriptive name of the element. |
| **categoryValue**: CategoryValue [0..*] | Specifies one or more values of the `Category` (e.g., the `Category` is "Region" then this `Category` could specify values like "North," "South," "West," and "East."). |

The `CategoryValue` element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.23 — CategoryValue attributes and model associations**

| Attributes | Description |
|---|---|
| **value**: string | Provides the value of the `CategoryValue` element. |
| **category**: Category [0..1] | Specifies the `Category` representing the `Category` as such and contains the `CategoryValue`. |
| **categorizedFlowElements**: FlowElement [0..*] | Identifies all of the elements (e.g., `Events`, `Activities`, `Gateways`, and `Artifacts`) that are within the boundaries of the `Group`. |

#### Text Annotation

**Text Annotations** are a mechanism for a modeler to provide additional information for the reader
of a BPMN Diagram.

- A **Text Annotation** is an open rectangle that MUST be drawn with a solid single line
  (*Figure 8.16 — A Text Annotation*).
- The use of text, color, size, and lines for a **Text Annotation** MUST follow the rules in §7.5.

The **Text Annotation** object can be connected to a specific object on the Diagram with an
**Association**, but does not affect the flow of the **Process**. The **Text Annotation** element
inherits the attributes and model associations of `BaseElement` (Table 8.5).

**Table 8.24 — Text Annotation attributes**

| Attributes | Description |
|---|---|
| **text**: string | Text that the modeler wishes to communicate to the reader of the Diagram. |
| **textFormat**: string | Identifies the format of the text. It MUST follow the mime-type format. The default is `text/plain`. |

#### XML Schema for Artifacts

**Table 8.25 — Artifact XML schema**

```xml
<xsd:element name="artifact" type="tArtifact"/>
<xsd:complexType name="tArtifact" abstract="true">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement"/>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.26 — Association XML schema**

```xml
<xsd:element name="association" type="tAssociation" substitutionGroup="artifact"/>
<xsd:complexType name="tAssociation">
    <xsd:complexContent>
        <xsd:extension base="tArtifact">
            <xsd:attribute name="sourceRef" type="xsd:QName" use="required"/>
            <xsd:attribute name="targetRef" type="xsd:QName" use="required"/>
            <xsd:attribute name="associationDirection" type="tAssociationDirection" default="None"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>

<xsd:simpleType name="tAssociationDirection">
    <xsd:restriction base="xsd:string">
        <xsd:enumeration value="None"/>
        <xsd:enumeration value="One"/>
        <xsd:enumeration value="Both"/>
    </xsd:restriction>
</xsd:simpleType>
```

**Table 8.27 — Category XML schema**

```xml
<xsd:element name="category" type="tCategory" substitutionGroup="rootElement"/>
<xsd:complexType name="tCategory">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:sequence>
                <xsd:element ref="categoryValue" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:string"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.28 — CategoryValue XML schema**

```xml
<xsd:element name="categoryValue" type="tCategoryValue"/>
<xsd:complexType name="tCategoryValue">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:attribute name="value" type="xsd:string" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.29 — Group XML schema**

```xml
<xsd:element name="group" type="tGroup" substitutionGroup="artifact"/>
<xsd:complexType name="tGroup">
    <xsd:complexContent>
        <xsd:extension base="tArtifact">
            <xsd:attribute name="categoryValueRef" type="xsd:QName" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.30 — Text Annotation XML schema**

```xml
<xsd:element name="textAnnotation" type="tTextAnnotation" substitutionGroup="artifact"/>
<xsd:complexType name="tTextAnnotation">
    <xsd:complexContent>
        <xsd:extension base="tArtifact">
            <xsd:sequence>
                <xsd:element ref="text" minOccurs="0" maxOccurs="1"/>
            </xsd:sequence>
            <xsd:attribute name="textFormat" type="xsd:string" default="text/plain"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>

<xsd:element name="text" type="tText"/>
<xsd:complexType name="tText" mixed="true">
    <xsd:sequence>
        <xsd:any namespace="##any" processContents="lax" minOccurs="0"/>
    </xsd:sequence>
</xsd:complexType>
```

### 8.4.2 Correlation (pp.72–78)

**Business Processes** typically can run for days or even months, requiring asynchronous
communication via **Message**. Also, many *instances* of a particular **Process** will typically
run in parallel (e.g., many *instances* of an order process, each representing a particular order).
*Correlation* is used to associate a particular **Message** to an ongoing **Conversation** between
two particular **Process** *instances*. BPMN allows using existing **Message** data for
*correlation* purposes (e.g., for the order process, a particular *instance* can be identified by
means of its `orderID` and/or `customerID`), rather than requiring the introduction of technical
*correlation* data.

The concept of *Correlation* facilitates the association of a **Message** to a **Send Task** or
**Receive Task** (all references to Send or Receive Tasks in this sub clause also include message
*catch* or *throw* **Events**; they behave identically with respect to correlation) often in the
context of a **Conversation**, which is also known as *instance routing*. It is particularly useful
where there is no infrastructure support for *instance* routing. Note that this association can be
viewed at multiple levels, namely the **Collaboration** (**Conversation**), **Choreography**, and
**Process** level. However, the actual correlation happens during runtime (e.g., at the **Process**
level). *Correlations* describe a set of predicates on a **Message** (generally on the application
payload) that need to be satisfied in order for that **Message** to be associated to a distinct
**Send Task** or **Receive Task**. By the same token, each **Send Task** and each **Receive Task**
participates in one or many **Conversations**, identifies the **Message** it sends or receives, and
thereby establishes the relationship to one (or many) `CorrelationKeys`.

There are two, non-exclusive correlation mechanisms in place:

1. In **plain, key-based correlation**, Messages that are exchanged within a **Conversation** are
   logically correlated by means of one or more common `CorrelationKeys`. Any **Message** that is
   sent or received within this **Conversation** needs to carry the value of at least one of these
   `CorrelationKey` instances in its payload. A `CorrelationKey` basically defines a (composite)
   key. The first **Message** that is initially sent or received initializes one or more
   `CorrelationKey` instances associated with the **Conversation** (assigns values to its
   `CorrelationProperty` fields = partial keys). A `CorrelationKey` is only considered valid for
   use if the **Message** has resulted in all `CorrelationProperty` fields within the key being
   populated with a value. If a follow-up **Message** derives a `CorrelationKey` instance that had
   previously been initialized within the **Conversation**, then the `CorrelationKey` value in the
   **Message** and **Conversation** MUST match. If the follow-up **Message** derives a
   `CorrelationKey` instance associated with the **Conversation**, that had not previously been
   initialized, then the `CorrelationKey` value will become associated with the **Conversation**.
   As a **Conversation** can comprise different **Messages** that can be differently structured,
   each `CorrelationProperty` comes with as many extraction rules
   (`CorrelationPropertyRetrievalExpression`) for the respective partial key as there are
   different **Messages**.

2. In **context-based correlation**, the **Process** context (i.e., its **Data Objects** and
   `Properties`) can dynamically influence the matching criterion. That is, a `CorrelationKey` can
   be complemented by a **Process**-specific `CorrelationSubscription`. A `CorrelationSubscription`
   aggregates as many `CorrelationPropertyBindings` as there are `CorrelationProperties` in the
   `CorrelationKey`. A `CorrelationPropertyBinding` relates to a specific `CorrelationProperty` and
   also links to a `FormalExpression` that denotes a dynamic extraction rule atop the **Process**
   context. At runtime, the `CorrelationKey` instance for a particular **Conversation** is
   populated (and dynamically updated) from the **Process** context using these `FormalExpressions`.
   In that sense, changes in the **Process** context can alter the correlation condition.

*Correlation* can be applied to **Message Flows** in **Collaboration** and **Choreography** (Clause
9 and 11). The keys applying to a **Message Flow** are the keys of containers or groupings of the
**Message Flow**, such as **Collaborations**, **Choreographies**, and **Conversation Nodes**, and
**Choreography Activities**. This might result in multiple `CorrelationKeys` applying to the same
**Message Flow**, perhaps due to multiple layers of containment. In particular, calls of
**Collaborations** and **Choreographies** are special kinds of **Conversation Nodes** and
**Choreography Activities**, respectively, and are considered a kind of containment for the
purposes of *correlation*. The `CorrelationKeys` specified in the caller apply to **Message Flow**
in a called **Collaboration** or **Choreography**.

*Figure 8.17 — The Correlation Class Diagram.*

#### CorrelationKey

A `CorrelationKey` represents a composite key out of one or many `CorrelationProperties` that
essentially specify extraction `Expressions` atop **Messages**. As a result, each
`CorrelationProperty` acts as a partial key for the *correlation*. For each **Message** that is
exchanged as part of a particular **Conversation**, the `CorrelationProperties` need to provide a
`CorrelationPropertyRetrievalExpression` which references the **Message** payload (that is, for
each **Message** there is an `Expression`, which extracts portions of the respective **Message's**
payload). The `CorrelationKey` element inherits the attributes and model associations of
`BaseElement` (Table 8.5).

**Table 8.31 — CorrelationKey model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string [0..1] | Specifies the name of the `CorrelationKey`. |
| **correlationPropertyRef**: CorrelationProperty [0..*] | The `CorrelationProperties`, representing the partial keys of this `CorrelationKey`. |

The `CorrelationProperty` element inherits the attributes and model associations of `BaseElement`
(Table 8.5) through its relationship to `RootElement`.

**Table 8.32 — CorrelationProperty model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string [0..1] | Specifies the name of the `CorrelationProperty`. |
| **type**: string [0..1] | Specifies the type of the `CorrelationProperty`. |
| **correlationPropertyRetrievalExpression**: CorrelationPropertyRetrievalExpression [1..*] | The `CorrelationPropertyRetrievalExpressions` for this `CorrelationProperty`, representing the associations of `FormalExpressions` (extraction paths) to specific **Messages** occurring in this **Conversation**. |

The `CorrelationPropertyRetrievalExpression` element inherits the attributes and model associations
of `BaseElement` (Table 8.5).

**Table 8.33 — CorrelationPropertyRetrievalExpression model associations**

| Attribute Name | Description/Usage |
|---|---|
| **messagePath**: FormalExpression | The `FormalExpression` that defines how to extract a `CorrelationProperty` from the **Message** payload. |
| **messageRef**: Message | The specific **Message** the `FormalExpression` extracts the `CorrelationProperty` from. |

The `CorrelationSubscription` element inherits the attributes and model associations of
`BaseElement` (Table 8.5).

**Table 8.34 — CorrelationSubscription model associations**

| Attribute Name | Description/Usage |
|---|---|
| **correlationKeyRef**: CorrelationKey | The `CorrelationKey` this `CorrelationSubscription` refers to. |
| **correlationPropertyBinding**: CorrelationPropertyBinding [0..*] | The bindings to specific `CorrelationProperties` and `FormalExpressions` (extraction rules atop the **Process** context). |

The `CorrelationPropertyBinding` element inherits the attributes and model associations of
`BaseElement` (Table 8.5).

**Table 8.35 — CorrelationPropertyBinding model associations**

| Attribute Name | Description/Usage |
|---|---|
| **dataPath**: FormalExpression | The `FormalExpression` that defines the extraction rule atop the **Process** context. |
| **correlationPropertyRef**: CorrelationProperty | The specific `CorrelationProperty` this `CorrelationPropertyBinding` refers to. |

#### XML Schema for Correlation

**Table 8.36 — Correlation Key XML schema**

```xml
<xsd:element name="correlationKey" type="tCorrelationKey"/>
<xsd:complexType name="tCorrelationKey">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="correlationPropertyRef" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:String" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.37 — Correlation Property XML schema**

```xml
<xsd:element name="correlationProperty" type="tCorrelationProperty" substitutionGroup="rootElement"/>
<xsd:complexType name="tCorrelationProperty">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:sequence>
                <xsd:element ref="correlationPropertyRetrievalExpression" minOccurs="1" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:String" use="optional"/>
            <xsd:attribute name="type" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.38 — Correlation Property Binding XML schema**

```xml
<xsd:element name="correlationPropertyBinding" type="tCorrelationPropertyBinding"/>
<xsd:complexType name="tCorrelationPropertyBinding">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="dataPath" type="tFormalExpression" minOccurs="1" maxOccurs="1"/>
            </xsd:sequence>
            <xsd:attribute name="correlationPropertyRef" type="xsd:QName" use="required"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.39 — Correlation Property Retrieval Expression XML schema**

```xml
<xsd:element name="correlationPropertyRetrievalExpression" type="tCorrelationPropertyRetrievalExpression"/>
<xsd:complexType name="tCorrelationPropertyRetrievalExpression">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="messagePath" type="tFormalExpression" minOccurs="1" maxOccurs="1"/>
            </xsd:sequence>
            <xsd:attribute name="messageRef" type="xsd:QName" use="required"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.40 — Correlation Subscription XML schema**

```xml
<xsd:element name="correlationSubscription" type="tCorrelationSubscription"/>
<xsd:complexType name="tCorrelationSubscription">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="process" type="xsd:QName" use="required"/>
                <xsd:element ref="correlationKeyRef" minOccurs="1" maxOccurs="1"/>
                <xsd:element name="correlationPropertyBinding" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

### 8.4.3 Error (p.79)

An `Error` represents the content of an **Error Event** or the `Fault` of a failed `Operation`. An
`ItemDefinition` is used to specify the structure of the `Error`. An `Error` is generated when
there is a critical problem in the processing of an **Activity** or when the execution of an
`Operation` failed. *Figure 8.18 — Error class diagram.* The `Error` element inherits the
attributes and model associations of `BaseElement` (Table 8.5), through its relationship to
`RootElement`.

**Table 8.41 — Error attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **structureRef**: ItemDefinition [0..1] | An `ItemDefinition` is used to define the "payload" of the `Error`. |
| **name**: string | The descriptive name of the `Error`. |
| **errorCode**: string | For an **End Event**: if the *result* is an `Error`, then the `errorCode` MUST be supplied (if the `processType` attribute of the Process is set to `executable`). This "throws" the `Error`. For an **Intermediate Event** within *normal flow*: if the *trigger* is an `Error`, then the `errorCode` MUST be entered (if the `processType` attribute of the **Process** is set to `executable`). This "throws" the `Error`. For an **Intermediate Event** attached to the boundary of an **Activity**: if the *trigger* is an `Error`, then the `errorCode` MAY be entered. This **Event** "catches" the `Error`. If there is no `errorCode`, then any error SHALL trigger the **Event**. If there is an `errorCode`, then only an `Error` that matches the `errorCode` SHALL trigger the **Event**. |

### 8.4.4 Escalation (pp.80–81)

An `Escalation` identifies a business situation that a **Process** might need to react to. An
`ItemDefinition` is used to specify the structure of the `Escalation`. *Figure 8.19 — Escalation
class diagram.* The `Escalation` element inherits the attributes and model associations of
`BaseElement` (Table 8.5), through its relationship to `RootElement`.

**Table 8.42 — Escalation attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **structureRef**: ItemDefinition [0..1] | An `ItemDefinition` is used to define the "payload" of the `Escalation`. |
| **name**: string | The descriptive name of the `Escalation`. |
| **escalationCode**: string | For an **End Event**: if the Result is an `Escalation`, then the `escalationCode` MUST be supplied (if the `processType` attribute of the **Process** is set to `executable`). This "throws" the `Escalation`. For an **Intermediate Event** within *normal flow*: if the *trigger* is an `Escalation`, then the `escalationCode` MUST be entered (if `processType` is `executable`). This "throws" the `Escalation`. For an **Intermediate Event** attached to the boundary of an **Activity**: if the *trigger* is an `Escalation`, then the `escalationCode` MAY be entered. This **Event** "catches" the `Escalation`. If there is no `escalationCode`, then any `Escalation` SHALL trigger the **Event**. If there is an `escalationCode`, then only an `Escalation` that matches the `escalationCode` SHALL trigger the **Event**. |

### 8.4.5 Events (pp.81–82)

An **Event** is something that happens during the course of a **Process**. These **Events** affect
the flow of the **Process** and usually have a cause or an impact. The term event is general enough
to cover many things in a **Process** (the start of an **Activity**, the end of an **Activity**, the
change of state of a document, a **Message** that arrives, etc.). However, BPMN has restricted the
use of **Events** to include only those types of **Events** that will affect the sequence or timing
of **Activities** of a **Process**.

*Figure 8.20 — Event class diagram.* The **Event** element inherits the attributes and model
associations of `FlowElement` (Table 8.44), but adds no additional attributes or model
associations. The details for the types of **Events** (**Start**, **Intermediate**, and **End**)
are defined in "Event Definitions" (§10.5.5).

### 8.4.6 Expressions (pp.82–84)

The `Expression` class is used to specify an `Expression` using natural-language text. These
`Expressions` are not executable. The natural language text is captured using the `documentation`
attribute, inherited from `BaseElement`. `Expression` inherits the attributes and model
associations of `BaseElement` (Table 8.5), but adds no additional attributes or model associations.

`Expressions` are used in many places within BPMN to extract information from the different
elements, normally data elements. The most common usage is when modeling decisions, where
conditional `Expressions` are used to direct the flow along specific paths based on some criteria.
BPMN supports underspecified `Expressions`, where the logic is captured as natural-language
descriptive text. It also supports formal `Expressions`, where the logic is captured in an
executable form using a specified `Expression` language. *Figure 8.21 — Expression class diagram.*

#### Expression

The `Expression` class is used to specify an `Expression` using natural-language text. These
`Expressions` are not executable and are considered underspecified. The definition of an
`Expression` can be done in two ways: it can be contained where it is used, or it can be defined at
the **Process** level and then referenced where it is used. The `Expression` element inherits the
attributes and model associations of `BaseElement` (Table 8.5), but does not have any additional
attributes or model associations.

#### Formal Expression

The `FormalExpression` class is used to specify an executable `Expression` using a specified
`Expression` language. A natural-language description of the `Expression` can also be specified, in
addition to the formal specification. The default `Expression` language for all `Expressions` is
specified in the `Definitions` element, using the `expressionLanguage` attribute. It can also be
overridden on each individual `FormalExpression` using the same attribute. The `FormalExpression`
element inherits the attributes and model associations of `BaseElement` (Table 8.5), through the
`Expression` element.

**Table 8.43 — FormalExpression attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **language**: string [0..1] | Overrides the `Expression` language specified in the `Definitions`. The language MUST be specified in a URI format. |
| **body**: Element | The body of the `Expression`. Note that this attribute is not relevant when the XML Schema is used for interchange. Instead, the `FormalExpression` complex type supports mixed content. The body of the `Expression` would be specified as element content. For example: `<formalExpression id="ID_2"> count(../dataObject[id="CustomerRecord_1"]/emailAddress) > 0 <evaluatesToType id="ID_3" typeRef="xsd:boolean"/> </formalExpression>` |
| **evaluatesToTypeRef**: ItemDefinition | The type of object that this `Expression` returns when evaluated. For example, *conditional* `Expressions` evaluate to a *boolean*. |

### 8.4.7 Flow Element (pp.84–85)

`FlowElement` is the abstract super class for all elements that can appear in a **Process** flow,
which are `FlowNodes` (see §8.4.13 / §10.3 / §10.6 / §10.5, consisting of **Activities**,
**Choreography Activities**, **Gateways**, and **Events**), **Data Objects** (§10.4), **Data
Associations** (§10.4), and **Sequence Flows** (§8.4.13). *Figure 8.22 — FlowElement class
diagram.* The `FlowElement` element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.44 — FlowElement attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string [0..1] | The descriptive name of the element. |
| **categoryValueRef**: CategoryValue [0..*] | A reference to the `Category Values` that are associated with this `FlowElement`. |
| **auditing**: Auditing [0..1] | A hook for specifying audit related properties. `Auditing` can only be defined for a **Process**. |
| **monitoring**: Monitoring [0..1] | A hook for specifying monitoring related properties. `Monitoring` can only be defined for a **Process**. |

### 8.4.8 Flow Elements Container (pp.86–87)

`FlowElementsContainer` is an abstract super class for BPMN diagrams (or views) and defines the
superset of elements that are contained in those diagrams. Basically, a `FlowElementsContainer`
contains `FlowElements`, which are **Events** (§10.5), **Gateways** (§10.6), **Sequence Flows**
(§8.4.13), **Activities** (§10.3), and **Choreography Activities** (§11.5). There are four (4)
types of `FlowElementsContainers` (*Figure 8.23 — FlowElementsContainer class diagram*):
**Process**, **Sub-Process**, **Choreography**, and **Sub-Choreography**. The
`FlowElementsContainer` element inherits the attributes and model associations of `BaseElement`
(Table 8.5).

**Table 8.45 — FlowElementsContainer model associations**

| Attribute Name | Description/Usage |
|---|---|
| **flowElements**: FlowElement [0..*] | Specifies the particular **flow elements** contained in a `FlowElementsContainer`. *Flow elements* are **Events**, **Gateways**, **Sequence Flows**, **Activities**, and **Choreography Activities**. Note that: **Choreography Activities** MUST NOT be included as a `flowElement` for a **Process**; **Activities**, **Data Associations**, and **Data Objects** MUST NOT be included as a `flowElement` for a **Choreography**. |
| **laneSets**: LaneSet [0..*] | Defines the list of `LaneSets` used in the `FlowElementsContainer`. `LaneSets` are not used for **Choreographies** or **Sub-Choreographies**. |

### 8.4.9 Gateways (p.88)

**Gateways** are used to control how the **Process** flows (how *Tokens* flow) through **Sequence
Flows** as they converge and diverge within a **Process**. If the flow does not need to be
controlled, then a **Gateway** is not needed. The term "gateway" implies that there is a gating
mechanism that either allows or disallows passage through the **Gateway**; that is, as *tokens*
arrive at a **Gateway**, they can be merged together on input and/or split apart on output as the
**Gateway** mechanisms are invoked.

**Gateways**, like **Activities**, are capable of consuming or generating additional control
*tokens*, effectively controlling the execution semantics of a given **Process**. The main
difference is that **Gateways** do not represent "work" being done and they are considered to have
zero effect on the operational measures of the **Process** being executed (cost, time, etc.).

The **Gateway** controls the flow of both diverging and converging **Sequence Flows**. That is, a
single **Gateway** could have multiple input and multiple output flows. Modelers and modeling tools
might want to enforce a best practice of a **Gateway** only performing one of these functions. Thus,
it would take two sequential **Gateways** to first converge and then to diverge the **Sequence
Flows**.

*Figure 8.24 — Gateway class diagram* (`EventBasedGatewayType` {Parallel | Exclusive};
`GatewayDirection` {Unspecified | Converging | Diverging | Mixed}; subtypes **ExclusiveGateway**,
**InclusiveGateway**, **ParallelGateway**, **ComplexGateway**, **EventBasedGateway**). The
**Gateway** class is an abstract type. Its concrete subclasses define the specific semantics of
individual **Gateway** types, defining how the **Gateway** behaves in different situations. The
**Gateway** element inherits the attributes and model associations of `FlowElement` (Table 8.44).

**Table 8.46 — Gateway attributes**

| Attribute Name | Description/Usage |
|---|---|
| **gatewayDirection**: GatewayDirection = Unspecified {Unspecified \| Converging \| Diverging \| Mixed} | An attribute that adds constraints on how the **Gateway** MAY be used. **Unspecified**: there are no constraints; the **Gateway** MAY have any number of *incoming* and *outgoing* **Sequence Flows**. **Converging**: this **Gateway** MAY have multiple *incoming* **Sequence Flows** but MUST have no more than one (1) *outgoing* **Sequence Flow**. **Diverging**: this **Gateway** MAY have multiple *outgoing* **Sequence Flows** but MUST have no more than one (1) *incoming* **Sequence Flow**. **Mixed**: this **Gateway** contains multiple *outgoing* and multiple *incoming* **Sequence Flows**. |

The details for the types of **Gateways** (**Exclusive**, **Inclusive**, **Parallel**,
**Event-Based**, and **Complex**) are defined in §10.6 for **Processes** and §11.7 for
**Choreographies**.

### 8.4.10 Item Definition (pp.89–90)

BPMN elements, such as `DataObjects` and `Messages`, represent items that are manipulated,
transferred, transformed, or stored during **Process** flows. These items can be either physical
items, such as the mechanical part of a vehicle, or information items such as the catalog of the
mechanical parts of a vehicle. An important characteristics of items in **Process** is their
structure. BPMN does not require a particular format for this data structure, but it does designate
XML Schema as its default. The `structure` attribute references the actual data structure.

The default format of the data structure for all elements can be specified in the `Definitions`
element using the `typeLanguage` attribute (e.g., a `typeLanguage` value of
`http://www.w3.org/2001/XMLSchema` indicates that the data structures using by elements within that
Definitions are in the form of XML Schema types). If unspecified, the default is XML schema. An
Import is used to further identify the location of the data structure (if applicable).

Structure definitions are always defined as separate entities, so they cannot be inlined in one of
their usages. This is why this class inherits from `RootElement`. An `ItemDefinition` element can
specify an import reference where the proper definition of the structure is defined. In cases where
the data structure represents a collection, the multiplicity can be projected into the attribute
`isCollection`. If this attribute is set to "true," but the actual type is not a collection type,
the model is considered as invalid. BPMN compliant tools might support an automatic check for these
inconsistencies and report this as an error. The default value for this element is "false." The
`itemKind` attribute specifies the nature of an item which can be a physical or an information item.

*Figure 8.25 — ItemDefinition class diagram* (`ItemKind` {Physical | Information}). The
`ItemDefinition` element inherits the attributes and model associations `BaseElement` (Table 8.5)
through its relationship to `RootElement`.

**Table 8.47 — ItemDefinition attributes & model associations**

| Attribute Name | Description/Usage |
|---|---|
| **itemKind**: ItemKind = Information {Information \| Physical} | Defines the nature of the Item. Possible values are `physical` or `information`. The default value is `information`. |
| **structureRef**: [Element 0..1] | The concrete data structure to be used. |
| **import**: Import [0..1] | Identifies the location of the data structure and its format. If the `importType` attribute is left unspecified, the `typeLanguage` specified in the `Definitions` that contains this `ItemDefinition` is assumed. |
| **isCollection**: boolean = False | Setting this flag to *true* indicates that the actual data type is a collection. |

### 8.4.11 Message (pp.91–92)

A **Message** represents the content of a communication between two *Participants*. In BPMN 2.0.2, a
**Message** is a graphical decorator (it was a supporting element in BPMN 1.2). An `ItemDefinition`
is used to specify the **Message** structure.

When displayed in a diagram:

- A **Message** is a rectangle with converging diagonal lines in the upper half of the rectangle to
  give the appearance of an envelope (*Figure 8.26 — A Message*). It MUST be drawn with a single
  thin line.
- The use of text, color, size, and lines for a **Message** MUST follow the rules in §7.5.

In addition, when used in a **Choreography** Diagram more than one **Message** MAY be used for a
single **Choreography Task**. In this case, it is important to know the first (initiating)
**Message** of the interaction. For return (non-initiating) **Messages** the symbol of the
**Message** is shaded with a light fill (*Figure 8.27 — A non-initiating Message*). Any **Message**
sent by the non-initiating *Participant* or **Sub-Choreography** MUST be shaded with a light fill.

In a **Collaboration**, the communication itself is represented by a **Message Flow** (see §9.4).
The **Message** can be optionally depicted as a graphical decorator on a **Message Flow** in a
**Collaboration** (*Figures 8.28 and 8.29*). *Figure 8.30 — The Message class diagram.* The
**Message** element inherits the attributes and model associations of `BaseElement` (Table 8.5)
through its relationship to `RootElement`.

**Table 8.48 — Message attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | Name is a text description of the **Message**. |
| **itemRef**: ItemDefinition [0..1] | An `ItemDefinition` is used to define the "payload" of the **Message**. |

### 8.4.12 Resources (pp.93–94)

The `Resource` class is used to specify resources that can be referenced by **Activities**. These
`Resources` can be **Human Resources** as well as any other resource assigned to **Activities**
during **Process** execution time. The definition of a `Resource` is "abstract," because it only
defines the `Resource`, without detailing how (e.g., actual user IDs are associated at runtime).
Multiple **Activities** can utilize the same `Resource`. Every `Resource` can define a set of
`ResourceParameters`. These `parameters` can be used at runtime to define query (e.g., into an
Organizational Directory). Every **Activity** referencing a parameterized `Resource` can bind
values available in the scope of the **Activity** to these `parameters`. *Figure 8.31 — Resource
class diagram.* The `Resource` element inherits the attributes and model associations of
`BaseElement` (Table 8.5) through its relationship to `RootElement`.

**Table 8.49 — Resource attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | Specifies the name of the `Resource`. |
| **resourceParameters**: ResourceParameter [0..*] | Specifies the definition of the parameters needed at runtime to resolve the `Resource`. |

The `ResourceParameter` element inherits the attributes and model associations of `BaseElement`
(Table 8.5) through its relationship to `RootElement`.

**Table 8.50 — ResourceParameter attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | Specifies the name of the query `parameter`. |
| **type**: ItemDefinition | Specifies the type of the query `parameter`. |
| **isRequired**: boolean | Specifies if a `parameter` is optional or mandatory. |

### 8.4.13 Sequence Flow (pp.94–97)

A **Sequence Flow** is used to show the order of `Flow Elements` in a **Process** or a
**Choreography**. Each **Sequence Flow** has only one *source* and only one *target*. The *source*
and *target* MUST be from the set of the following `Flow Elements`: **Events** (**Start**,
**Intermediate**, and **End**), **Activities** (**Task** and **Sub-Process**; for **Processes**),
**Choreography Activities** (**Choreography Task** and **Sub-Choreography**; for **Choreographies**),
and **Gateways**.

- A **Sequence Flow** is line with a solid arrowhead that MUST be drawn with a solid single line
  (*Figure 8.32 — A Sequence Flow*).
- The use of text, color, size, and lines for a **Sequence Flow** MUST follow the rules in §7.5.

A **Sequence Flow** can optionally define a condition `Expression`, indicating that the *token* will
be passed down the **Sequence Flow** only if the `Expression` evaluates to *true*. This `Expression`
is typically used when the source of the **Sequence Flow** is a **Gateway** or an **Activity**.

- A *conditional outgoing* **Sequence Flow** from an **Activity** MUST be drawn with a mini-diamond
  marker at the beginning of the connector (*Figure 8.33 — A Conditional Sequence Flow*). If a
  *conditional* **Sequence Flow** is used from a source **Activity**, then there MUST be at least
  one other *outgoing* **Sequence Flow** from that **Activity**.
- *Conditional outgoing* **Sequence Flows** from a **Gateway** MUST NOT be drawn with a mini-diamond
  marker at the beginning of the connector. A source **Gateway** MUST NOT be of type **Parallel** or
  **Event**.

A **Sequence Flow** that has an **Exclusive**, **Inclusive**, or **Complex Gateway** or an
**Activity** as its source can also be defined as *default*. Such a **Sequence Flow** will have a
marker to show that it is a *default* flow. The *default* **Sequence Flow** is taken (a token is
passed) only if all the other *outgoing* **Sequence Flows** from the **Activity** or **Gateway** are
not valid (i.e., their condition `Expressions` are *false*).

- A *default outgoing* **Sequence Flow** MUST be drawn with a slash marker at the beginning of the
  connector (*Figure 8.34 — A Default Sequence Flow*).

*Figure 8.35 — SequenceFlow class diagram.* The **Sequence Flow** element inherits the attributes
and model associations of `FlowElement` (Table 8.44).

**Table 8.51 — SequenceFlow attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **sourceRef**: FlowNode | The `FlowNode` that the **Sequence Flow** is connecting from. For a **Process**: of the types of FlowNode, only **Activities**, **Gateways**, and **Events** can be the *source*. However, **Activities** that are **Event Sub-Processes** are not allowed to be a *source*. For a **Choreography**: of the types of FlowNode, only Choreography **Activities**, **Gateways**, and **Events** can be the *source*. |
| **targetRef**: FlowNode | The `FlowNode` that the **Sequence Flow** is connecting to. For a **Process**: only **Activities**, **Gateways**, and **Events** can be the target. However, **Activities** that are **Event Sub-Processes** are not allowed to be a target. For a **Choreography**: only Choreography **Activities**, **Gateways**, and **Events** can be the target. |
| **conditionExpression**: Expression [0..1] | An optional boolean `Expression` that acts as a gating condition. A *token* will only be placed on this **Sequence Flow** if this `conditionExpression` evaluates to true. |
| **isImmediate**: boolean [0..1] | An optional boolean value specifying whether **Activities** or **Choreography Activities** not in the model containing the **Sequence Flow** can occur between the elements connected by the **Sequence Flow**. If the value is true, they MAY NOT occur. If the value is false, they MAY occur. Also see the `isClosed` attribute on Process, Choreography, and Collaboration. When the attribute has no value, the default semantics depends on the kind of model containing **Sequence Flows**: for non-executable **Processes** (public Processes and non-executable private Processes) and **Choreographies** no value has the same semantics as if the value were *false*; for an executable **Process** no value has the same semantics as if the value were *true*; for executable **Processes**, the attribute MUST NOT be *false*. |

#### Flow Node

The `FlowNode` element is used to provide a single element as the source and target **Sequence
Flow** associations (*Figure 8.35*) instead of the individual associations of the elements that can
connect to **Sequence Flows** (above). Only the **Gateway**, **Activity**, **Choreography
Activity**, and **Event** elements can connect to **Sequence Flows** and thus, these elements are
the only ones that are sub-classes of `FlowNode`. Since **Gateway**, **Activity**, **Choreography
Activity**, and **Event** have their own attributes, model associations, and inheritances, the
`FlowNode` element does not inherit from any other BPMN element.

**Table 8.52 — FlowNode model associations**

| Attribute Name | Description/Usage |
|---|---|
| **incoming**: Sequence Flow [0..*] | Identifies the *incoming* **Sequence Flow** of the `FlowNode`. |
| **outgoing**: Sequence Flow [0..*] | Identifies the *outgoing* **Sequence Flow** of the `FlowNode`. This is an ordered collection. |

### 8.4.14 Common Package XML Schemas (pp.98–101)

**Table 8.53 — Error XML schema**

```xml
<xsd:element name="error" type="tError" substitutionGroup="rootElement"/>
<xsd:complexType name="tError">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:attribute name="name" type="xsd:string"/>
            <xsd:attribute name="errorCode" type="xsd:string"/>
            <xsd:attribute name="structureRef" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.54 — Escalation XML schema**

```xml
<xsd:element name="escalation" type="tEscalation" substitutionGroup="rootElement"/>
<xsd:complexType name="tEscalation">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:attribute name="name" type="xsd:string"/>
            <xsd:attribute name="escalationCode" type="xsd:string"/>
            <xsd:attribute name="structureRef" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.55 — Expression XML schema**

```xml
<xsd:element name="expression" type="tExpression"/>
<xsd:complexType name="tExpression">
    <xsd:complexContent>
        <xsd:extension base="tBaseElementWithMixedContent"/>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.56 — FlowElement XML schema**

```xml
<xsd:element name="flowElement" type="tFlowElement"/>
<xsd:complexType name="tFlowElement" abstract="true">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element ref="auditing" minOccurs="0" maxOccurs="1"/>
                <xsd:element ref="monitoring" minOccurs="0" maxOccurs="1"/>
                <xsd:element name="categoryValueRef" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:string"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.57 — FlowNode XML schema**

```xml
<xsd:element name="flowNode" type="tFlowNode"/>
<xsd:complexType name="tFlowNode" abstract="true">
    <xsd:complexContent>
        <xsd:extension base="tFlowElement">
            <xsd:sequence>
                <xsd:element name="incoming" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
                <xsd:element name="outgoing" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.58 — FormalExpression XML schema**

```xml
<xsd:element name="formalExpression" type="tFormalExpression" substitutionGroup="expression"/>
<xsd:complexType name="tFormalExpression">
    <xsd:complexContent>
        <xsd:extension base="tExpression">
            <xsd:attribute name="language" type="xsd:anyURI" use="optional"/>
            <xsd:attribute name="evaluatesToTypeRef" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.59 — InputOutputBinding XML schema**

```xml
<xsd:element name="ioBinding" type="tinputOutputBinding"/>
<xsd:complexType name="tinputOutputBinding">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:attribute name="inputDataRef" type="xsd:IDREF"/>
            <xsd:attribute name="outputDataRef" type="xsd:IDREF"/>
            <xsd:attribute name="operationRef" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.60 — ItemDefinition XML schema**

```xml
<xsd:element name="itemDefinition" type="tItemDefinition" substitutionGroup="rootElement"/>
<xsd:complexType name="tItemDefinition">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:attribute name="structureRef" type="xsd:QName"/>
            <xsd:attribute name="isCollection" type="xsd:boolean" default="false"/>
            <xsd:attribute name="itemKind" type="tItemKind" default="Information"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>

<xsd:simpleType name="tItemKind">
    <xsd:restriction base="xsd:string">
        <xsd:enumeration value="Information"/>
        <xsd:enumeration value="Physical"/>
    </xsd:restriction>
</xsd:simpleType>
```

**Table 8.61 — Message XML schema**

```xml
<xsd:element name="message" type="tMessage" substitutionGroup="rootElement"/>
<xsd:complexType name="tMessage">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:attribute name="name" type="xsd:string"/>
            <xsd:attribute name="itemRef" type="xsd:QName"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.62 — Resources XML schema**

```xml
<xsd:element name="resource" type="tResource" substitutionGroup="rootElement"/>
<xsd:complexType name="tResource">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:sequence>
                <xsd:element ref="resourceParameter" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:string" use="required"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.63 — ResourceParameter XML schema**

```xml
<xsd:element name="resourceParameter" type="tResourceParameter" />
<xsd:complexType name="tResourceParameter">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:attribute name="name" type="xsd:string"/>
            <xsd:attribute name="type" type="xsd:QName"/>
            <xsd:attribute name="isRequired" type="xsd:Boolean" />
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.64 — SequenceFlow XML schema**

```xml
<xsd:element name="sequenceFlow" type="tSequenceFlow" substitutionGroup="flowElement"/>
<xsd:complexType name="tSequenceFlow">
    <xsd:complexContent>
        <xsd:extension base="tFlowElement">
            <xsd:sequence>
                <xsd:element name="conditionExpression" type="tExpression" minOccurs="0" maxOccurs="1"/>
            </xsd:sequence>
            <xsd:attribute name="sourceRef" type="xsd:IDREF" use="required"/>
            <xsd:attribute name="targetRef" type="xsd:IDREF" use="required"/>
            <xsd:attribute name="isImmediate" type="xsd:boolean" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

## 8.5 Services (pp.101–105)

The Service package contains constructs necessary for modeling services, interfaces, and
operations. *Figure 8.36 — The Service class diagram.*

### 8.5.1 Interface (p.102)

An `Interface` defines a set of operations that are implemented by `Services`. The `Interface`
inherits the attributes and model associations of `BaseElement` (Table 8.5) through its relationship
to `RootElement`.

**Table 8.65 — Interface attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | The descriptive name of the element. |
| **operations**: Operation [1..*] | Specifies operations that are defined as part of the `Interface`. An `Interface` has at least one `Operation`. |
| **callableElements**: CallableElement [0..*] | The `CallableElements` that use this `Interface`. |
| **implementationRef**: Element [0..1] | Allows to reference a concrete artifact in the underlying implementation technology representing that interface, such as a WSDL porttype. |

### 8.5.2 EndPoint (p.103)

The actual definition of the service address is out of scope of BPMN 2.0. The `EndPoint` element is
an extension point and extends from `RootElement`. The `EndPoint` element MAY be extended with
endpoint reference definitions introduced in other specifications (e.g., WS-Addressing). `EndPoints`
can be specified for *Participants*.

### 8.5.3 Operation (p.103)

An `Operation` defines **Messages** that are consumed and, optionally, produced when the `Operation`
is called. It can also define zero or more errors that are returned when operation fails. The
`Operation` inherits the attributes and model associations of `BaseElement` (Table 8.5).

**Table 8.66 — Operation attributes and model associations**

| Attribute Name | Description/Usage |
|---|---|
| **name**: string | The descriptive name of the element. |
| **inMessageRef**: Message | Specifies the input **Message** of the `Operation`. An `Operation` has exactly one input **Message**. |
| **outMessageRef**: Message [0..1] | Specifies the output **Message** of the `Operation`. An `Operation` has at most one output **Message**. |
| **errorRef**: Error [0..*] | Specifies errors that the `Operation` may return. An `Operation` MAY refer to zero or more `Error` elements. |
| **implementationRef**: Element [0..1] | Allows to reference a concrete artifact in the underlying implementation technology representing that operation, such as a WSDL operation. |

### 8.5.4 Service Package XML Schemas (pp.104–105)

**Table 8.67 — Interface XML schema**

```xml
<xsd:element name="interface" type="tInterface" substitutionGroup="rootElement"/>
<xsd:complexType name="tInterface">
    <xsd:complexContent>
        <xsd:extension base="tRootElement">
            <xsd:sequence>
                <xsd:element ref="operation" minOccurs="1" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:string" use="required"/>
            <xsd:attribute name="implementationRef" type="xsd:QName" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.68 — Operation XML schema**

```xml
<xsd:element name="operation" type="tOperation"/>
<xsd:complexType name="tOperation">
    <xsd:complexContent>
        <xsd:extension base="tBaseElement">
            <xsd:sequence>
                <xsd:element name="inMessageRef" type="xsd:QName" minOccurs="1" maxOccurs="1"/>
                <xsd:element name="outMessageRef" type="xsd:QName" minOccurs="0" maxOccurs="1"/>
                <xsd:element name="errorRef" type="xsd:QName" minOccurs="0" maxOccurs="unbounded"/>
            </xsd:sequence>
            <xsd:attribute name="name" type="xsd:string" use="required"/>
            <xsd:attribute name="implementationRef" type="xsd:QName" use="optional"/>
        </xsd:extension>
    </xsd:complexContent>
</xsd:complexType>
```

**Table 8.69 — EndPoint XML schema**

```xml
<xsd:element name="endPoint" type="tEndPoint"/>
<xsd:complexType name="tEndPoint">
    <xsd:complexContent>
        <xsd:extension base="tRootElement"/>
    </xsd:complexContent>
</xsd:complexType>
```

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §8.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added the **missing §8.4.2 Correlation**, key attributes + multiplicities for every Common element, and class-diagram/table/page citations. |
| 1.4     | 2026-05-24 | Vũ Anh | Removed the "Mirrors §8" intro paragraph and the lead disclaimer; **replaced the summary with a full extraction of Clause 8 from the OMG BPMN 2.0.2 PDF (pp.47–106)** — every sub-clause (§8.1–§8.5), all attribute/association tables (8.1–8.2, 8.5–8.10, 8.15, 8.20–8.24, 8.31–8.35, 8.41–8.52, 8.65–8.66) reproduced in full, the XSD schema listings (8.3–8.4, 8.11–8.14, 8.17–8.19, 8.25–8.30, 8.36–8.40, 8.53–8.64, 8.67–8.69) as code blocks, and the figure references (Figs 8.1–8.36). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/08-bpmn-core-structure.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §8 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §8 (pp.47–106), Tables 8.1–8.69, Figures 8.1–8.36; `REF-BPMN-001 §7`.
