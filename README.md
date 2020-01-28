# JS4Shiny R2D3 Section

# Repo Layout

- `data/`: Various CSVs with raw and cleaned data.
- `data_manipulation_scripts/`: R Scripts to read and clean data for use in app. 
- `step_*/`: Full shiny app as it should exist at the end of each step.
- `tree_app/`: Final form of Shiny app. 
- `slides/`: RMarkdown slides for R2D3 presentation

# Project

## Lost?

There are a few things you can do to get unstuck

- You can skip a sticky step by simply going each steps folder to find the code as it should be at the end of the step. 
- Click the step title to see the exact code that should change for each step
- Ask questions! If it's confusing I guarentee it's not just you. This is complicated stuff!


## Steps

### [Step 1: Run shiny app with regression model to see how it works](https://github.com/nstrayer/jsforshiny_project/commit/b77bab206cb83bcff5ae11f51c08d3f9ad7cc7f1)
1. Open `step_1/app.R`
2. Press "Run App".
    
   
### [Step 2: Find visualization on Observable and paste into r2d3 script in RStudio](https://github.com/nstrayer/jsforshiny_project/commit/bbd6808fe32476a2c779cd8a500b0d93b9d996dc)
1. Go to [observable notebook with species visualization](https://observablehq.com/d/fa83c0bca9b47371)
2. Copy all the code inside comments `// Start copying here` and `// End copying here`.
3. Create a new "D3 Script" in RStudio
4. Paste all code from Observable into new file
5. Replace `data=c(0.3, 0.6, 0.8, 0.95, 0.40, 0.20)` in header with `readr::read_csv("data/tree_benefits.csv")`
6. Save file as `tree_viz.js` in `step_1/` folder


### [Step 3: Add display of plot to shiny app](https://github.com/nstrayer/jsforshiny_project/commit/c6abf7b1f585fe672776d79724fb6406e2df29eb)
1. Add `d3Output("tree_viz")` in your UI function
2. Add `output$tree_viz <- renderD3({r2d3(data = tree_benefits, script = "tree_viz.js")})` to Server function
3. Run app again


### [Step 4: Wire up message from visualization to shiny](https://github.com/nstrayer/jsforshiny_project/commit/89169aa0a61bfa374adbe7df9d14f4ff1e68bf4f)
1. In `tree_viz.js`, search for the function `submit_selection()` and uncomment the lines to send to shiny that starts with `// if(Shiny){...`.
2. Replace the lines for getting chosen species from `species_1 <- input$species_1` to `species_1 <- input$selected_species[1]` and `species_2 <- input$species_2` to `species_2 <- input$selected_species[2]`.
3. Add a `req(input$selected_species)` line at start of `output$regressionOutput <- renderPlot({` to avoid shiny attempting to run without input. 


