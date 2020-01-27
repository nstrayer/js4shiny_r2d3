// !preview r2d3 data=tree_benefits

const margin = {left: 80, right: 100, top: 50, bottom: 25};

const X = d3.scaleLog()
  .domain([4, d3.max(data, d => d.dollar_benefits)*1.5])
  .range([margin.left, width - margin.right]);
  
const Y = d3.scaleLog()
  .domain([15, d3.max(data, d => d.co2_benefits)*1.7])
  .range([height-margin.bottom, margin.top]);
  
const Size = d3.scaleSqrt()
  .domain([0, d3.max(data, d => d.num_obs)])
  .range([4,11]);
  
  
const trees = data
  .map(d => ({id: d.common_name,
              fx: X(d.dollar_benefits),
              fy: Y(d.co2_benefits),
              type: "data",
              ...d}));

const tree_labels = data
  .map(d => ({id: `${d.common_name}_label`, 
              type: 'label',
              x: X(d.dollar_benefits) + Math.random(),
              y: Y(d.co2_benefits) + Math.random(),
              label: name_to_tspans(d.common_name)}));

const trees_and_labels = [...trees,...tree_labels];
const tree_to_label = trees
  .map(d => ({source: d.common_name, 
              target: `${d.common_name}_label`}));


// Setup the simulation
const simulation = d3.forceSimulation(trees_and_labels)
      .force("charge", 
             d3.forceManyBody()
               .strength(d => d.type == 'data' ? 0: -70)
       )
      .force("link", 
             d3.forceLink(tree_to_label)
               .id(d => d.id)
               //.strength(0.5)
       )
      .force('collision', 
             d3.forceCollide()
               .radius(d => d.type == 'data' ? Size(d.num_obs) + 2: 30)
       );
  
const links = svg.selectAll('line.label')
  .data(tree_to_label)
  .enter().append('line')
  .attr('class', 'label')
  .attr('stroke-width', 1)
  .attr('stroke', 'grey');
  
  
svg.selectAll("circle.tree")  
  .data(trees_and_labels.filter(d => d.type == "data"))
  .enter().append('circle')
  .attr('class', 'tree')
  .attr('cx', d => d.fx)
  .attr('cy', d => d.fy)
  .attr("r", d => Size(d.num_obs))
  .attr("fill", "steelblue")
  .attr("fill-opacity", 0.75)
  .on("click", d => {
    console.log(d.common_name);
  });


  
const labels = svg.selectAll("g.label") 
  .data(trees_and_labels.filter(d => d.type == "label"))
  .enter().append('g')
  .attr('class', 'label');
  
labels.append('rect')
  .attr('y', -10)
  .attr('x', -15)
  .attr("width", 30)
  .attr('height', 20)
  .attr('fill', 'white')
  .attr('fill-opacity', 0.8);
  
const label_text = labels.append('text')
  .attr('text-anchor', 'middle')  
  .attr('font-size', 12)
  .html(d => d.label);
 
// Kickoff simulation
simulation.on("tick", () => {
    
  labels
    .attr('transform', d => `translate(${d.x}, ${d.y})`);
   
  links
    .attr('x2', d => d.source.x)
    .attr('x1', d => d.target.x)
    .attr('y2', d => d.source.y)
    .attr('y1', d => d.target.y);
});

// Draw axes
svg.append("g").call(g => g
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(X).ticks(width / 80, ","))
);

svg.append("g").call(g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(Y))
);



function name_to_tspans(name){
  return name
    .split(' ')
    .reduce(
      (full, line, i) => full + `<tspan x="0" ${i != 0 ? `dy="10"`: ""}>${line}</tspan>`,
      ''
      );
}

