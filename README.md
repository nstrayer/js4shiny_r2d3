## JS4Shiny R2D3 Section


## Project Tasks

1. Run shiny app with regression model to see how it works
    1. Open `step_1/app.R`
    2. Press "Run App".
2. Find javascript visualization on Observable and paste into r2d3 script in RStudio
    1. Go to [observable notebook with species visualization](https://observablehq.com/d/fa83c0bca9b47371)
    2. Copy all the code inside comments `// Start copying here` and `// End copying here`.
    3. Create a new "D3 Script" in RStudio
    4. Paste all code from Observable into new file
    5. Replace `data=c(0.3, 0.6, 0.8, 0.95, 0.40, 0.20)` in header with `readr::read_csv("data/tree_benefits.csv")`
    6. Save file as `tree_viz.js` in `step_1/` folder
3. Add display of plot to shiny app 
    1. Add `d3Output("tree_viz")` in your UI function
    2. Add `output$tree_viz <- renderD3({r2d3(data = tree_benefits, script = "tree_viz.js")})` to Server function
    3. Run app again
4. Wire up message from visualization to shiny. 
    1. In `tree_viz.js`, search for the function `submit_selection()` and uncomment the lines to send to shiny that starts with `// if(Shiny){...`.
    2. Replace the lines for getting chosen species from `species_1 <- input$species_1` to `species_1 <- input$selected_species[1]` and `species_2 <- input$species_2` to `species_2 <- input$selected_species[2]`.
    3. Add a `req(input$selected_species)` line at start of `output$regressionOutput <- renderPlot({` to avoid shiny attempting to run without input. 
  

