# Aldersbach Monastery Financial Data Analysis

## Data Overview
Historical financial transaction records from the Aldersbach monastery, primarily from 1557, stored in RDF/XML format.

**Files analyzed:**
- 12 RDF/XML files containing transaction data
- Mix of regular and test files (L341-L346 + test variants)
- Main file: o_depcha.aldersbach.1.xml (2.3MB)

## Data Structure

### Core Schema
Each transaction follows this RDF structure:
```xml
<bk:Transaction rdf:about="[unique_URI]">
  <bk:entry>[Original German text entry]</bk:entry>
  <bk:when>[YYYY-MM-DD date]</bk:when> <!-- Sometimes present -->
  <bk:consistsOf>
    <bk:Transfer>
      <bk:transfers>
        <bk:Money|bk:Commodity> <!-- What was transferred -->
        </bk:Money|bk:Commodity>
      </bk:transfers>
      <bk:from>[Source category]</bk:from>
      <bk:to>[Destination]</bk:to>
    </bk:Transfer>
  </bk:consistsOf>
</bk:Transaction>
```

### Key Fields

**bk:entry** - Original medieval German text describing the transaction
- Example: "Item den .28. Maii, Martin Öder von Aitenpach geben .4. Schaff waitz p. 4 ½. f. thut. .18. f."

**bk:when** - ISO date format (when available)
- Example: "1557-05-28"

**Money units:**
- `f` = Florin/Gulden
- `s` = Shilling  
- `d` = Denarius/Pfennig
- `gr` = Groschen

**Commodity units:**
- `Schaff` = Grain measure (~200L)
- `e` = Eimer (liquid measure)
- `piece` = Individual items

**Categories:**
- `einnahmen_einnemenumbverkaufftgetreidabdemcasten` = Income from grain sales
- `einnahmen_getreide` = Grain income
- Agricultural tools, construction materials, food items

### Data Patterns

1. **Grain Sales (Most Common)**
   - Large transactions: 18-360 florins
   - Wheat (waitz), oats (hafer), peas (erbsen)
   - Measured in Schaff units

2. **Tool/Equipment Purchases**
   - Small amounts: 2-35 pfennig
   - Cart parts, wheels, agricultural tools

3. **Date Coverage**
   - Primary focus: 1557 (Anno 1557)
   - Seasonal patterns: Spring transactions (April-May)

### Example Transactions

**High-value grain sale:**
```
Entry: "dem Zinnsperger zu Braunau .60. Schaff waitz zu .6. f. geben. thut. .360. f."
Amount: 360 florins for 60 Schaff of wheat
```

**Small equipment purchase:**
```  
Entry: "Item für eynen chipsstock iii d."
Amount: 3 denarius for 1 piece chipsstock
```

## Data Quality
- **Coverage**: 1000+ transactions across files
- **Completeness**: ~30% have explicit dates, all have amount/commodity data  
- **Language**: Medieval German with Latin elements
- **Structure**: Well-formed RDF with consistent schema