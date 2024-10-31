import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize
from matplotlib.ticker import FuncFormatter
import io

excel_file = "UHPC.xlsx"
df = pd.read_excel(excel_file, sheet_name='Sheet2')
d = df['Particle diameter'].values

# function to create PSD graph
def create_psd(file_list):

    plt.figure(figsize=(8, 6))
    
    d_plot = d[1:]
    colors = ['blue', 'orange', 'red', 'yellow', 'green']
    i = 0
    for file in file_list:
        ds = pd.read_excel(file.path, sheet_name='Measurement 0')
        values = ds.iloc[7:108,9].values
        print(file.material)
        plt.plot(d_plot, np.cumsum(values[1:]), label=file.material, color=colors[i], marker='o')
        i += 1
    
    plt.xscale('log') 
    plt.xlabel('Particle Diameter (μm)')
    plt.ylabel('Passing Percentage (%)')
    plt.title('Particle Size Distribution')

    plt.xlim(left=d_plot.min(), right=500)
    formatter = FuncFormatter(lambda x, _: f'{x:.0f}')
    plt.gca().xaxis.set_major_formatter(formatter)
    plt.xticks([d_plot.min(), 10, 100, 500])
    plt.grid(True, which="both", ls="--")
    plt.legend()
    
    img = io.BytesIO()
    plt.savefig(img, format='png', dpi=300)
    img.seek(0)
    plt.close()
    return {'img' : img}

def create_graph(file_list):
    
    # Extract columns from the DataFrame
    d = df['Particle diameter'].values
    A = 1
    B = 1
    C = 1
    D = 1

    for file in file_list:
        ds = pd.read_excel(file.path, sheet_name='Measurement 0')
        match file.material:
            case "Cement":
                A = ds.iloc[7:108,9].values
            case "Silica Fume":
                B = ds.iloc[7:108,9].values
            case "Sand":
                C = ds.iloc[7:108,9].values
            case "Slag":
                D = ds.iloc[7:108,9].values
            case _:
                print("material not found, something is wrong")

    def optimal_psd_function(d, q, min_d, max_d):
        d = np.array(d)
        alpha = (((d**q) - (min_d**q)) / ((max_d**q) - (min_d**q))) * 100
        return alpha

    d = df['Particle diameter']
    q = 0.25
    min_d = 0.1
    max_d = 500

    alpha = optimal_psd_function(d, q, min_d, max_d)
    print(alpha)

    # Define densities for the components (g/cm^3)
    Density_OPC = 3.15
    Density_SF = 2.2
    Density_SS = 2.6
    Density_Slag = 2.85

    # Fixed value for Weight_OPC
    Weight_OPC = 1.0

    # Define the RMSE function to minimize
    def rmse_function(weights):
        Weight_SF, Weight_SS, Weight_Slag = weights
        Total_Volume = (Weight_OPC / Density_OPC 
                        + Weight_SF / Density_SF 
                        + Weight_SS / Density_SS 
                        + Weight_Slag / Density_Slag)
        
        # Calculate Binder based on the provided formula
        Binder = (A * Weight_OPC / (Total_Volume * Density_OPC)
                + B * Weight_SF / (Total_Volume * Density_SF)
                + C * Weight_SS / (Total_Volume * Density_SS)
                + D * Weight_Slag / (Total_Volume * Density_Slag))
        
        # Create a cumulative column based on Binder
        cumulative = np.cumsum(Binder)

        # Save cumulative to be used for MAE calculation
        rmse_function.cumulative = cumulative
        rmse = np.sqrt(np.mean((alpha[1:100] - cumulative[1:100])**2))
        return rmse

    # Initial guess for the weights [Weight_SF, Weight_SS, Weight_Slag]
    initial_guess = [0.1, 1.0, 1.0 / 10]  # An initial guess within the acceptable range for Weight_Slag

    # Function to dynamically set bounds for weights
    def get_bounds():
        return [(0, 0.2), (1, None), (0, None)]

    # List of optimization methods that support bounds
    methods = ['L-BFGS-B', 'TNC', 'SLSQP']

    rmseString = ""
    for method in methods:
        bounds = get_bounds()
        result = minimize(rmse_function, initial_guess, bounds=bounds, method=method)
        
        # Extract the optimal weights
        optimal_weights = result.x
        
        # Calculate the cumulative Binder values for the optimal weights
        cumulative = rmse_function.cumulative
        
        # Calculate MAE
        mae = np.mean(np.abs(alpha[1:100] - cumulative[1:100]))
        
        # Format the output for this method
        rmseString += f"Method: {method}\n"
        rmseString += "Optimal weights (with Weight_OPC fixed at 1.0):\n"
        rmseString += "Weight_OPC = {:.3f}\n".format(Weight_OPC)
        rmseString += "Weight_SF = {:.3f}\n".format(optimal_weights[0])
        rmseString += "Weight_SS = {:.3f}\n".format(optimal_weights[1])
        rmseString += "Weight_Slag = {:.3f}\n".format(optimal_weights[2])
        rmseString += "<span>Minimum RMSE = {:.3f}\n</span>".format(result.fun)
        rmseString += "<span>MAE = {:.3f}\n\n</span>".format(mae)

    ################################################
    ################################################
    ################################################

    # A = CEMENT, B = SF, C = SAND, D = SLAG
    #A = df['Cement'].values
    #B = df['Silica Fume'].values
    #C = df['Sand'].values
    #D = df['Slag'].values

    #excel_file = filepath

    def optimal_psd_function(d, q, min_d, max_d):
        d = np.array(d)
        alpha = (((d**q) - (min_d**q)) / ((max_d**q) - (min_d**q))) * 100
        return alpha

    q = 0.25
    min_d = 0.1
    max_d = 500

    alpha = optimal_psd_function(d, q, min_d, max_d)

    # Define densities for the components (g/cm^3)
    Density_OPC = 3.15
    Density_SF = 2.2
    Density_SS = 2.6
    Density_Slag = 2.85

    # Fixed value for Weight_OPC
    Weight_OPC = 1.0

    # Define the RMSE function to minimize
    def rmse_function(weights):
        Weight_SF, Weight_SS, Weight_Slag = weights
        Total_Volume = (Weight_OPC / Density_OPC 
                        + Weight_SF / Density_SF 
                        + Weight_SS / Density_SS 
                        + Weight_Slag / Density_Slag)
        
        # Calculate Binder based on the provided formula
        Binder = (A * Weight_OPC / (Total_Volume * Density_OPC)
                + B * Weight_SF / (Total_Volume * Density_SF)
                + C * Weight_SS / (Total_Volume * Density_SS)
                + D * Weight_Slag / (Total_Volume * Density_Slag))
        
        # Create a cumulative column based on Binder
        cumulative = np.cumsum(Binder)

        # Save cumulative to be used for MAE calculation
        rmse_function.cumulative = cumulative
        rmse = np.sqrt(np.mean((alpha[1:] - cumulative[1:])**2))
        return rmse

    # Optimization with no boundaries
    initial_guess = [0.1, 1.0, 1.0 / 10]
    bounds_no_boundaries = [(0, None), (0, None), (0, None)]
    result_no_boundaries = minimize(rmse_function, initial_guess, bounds=bounds_no_boundaries, method='L-BFGS-B')
    optimal_weights_no_boundaries = result_no_boundaries.x
    No_Boundaries = rmse_function.cumulative

    # Optimization with specific bounds
    def get_bounds_balanced():
        return [(0, 0.2), (0, None), (0.091, None)]

    result_balanced = minimize(rmse_function, initial_guess, bounds=get_bounds_balanced(), method='L-BFGS-B')
    optimal_weights_balanced = result_balanced.x
    Balanced = rmse_function.cumulative

    def get_bounds_economical():
        return [(0, 0.2), (1, None), (0, None)]

    result_economical = minimize(rmse_function, initial_guess, bounds=get_bounds_economical(), method='L-BFGS-B')
    optimal_weights_economical = result_economical.x
    Economical = rmse_function.cumulative

    # Calculate RMSE values
    def calculate_rmse(true_values, predicted_values):
        return np.sqrt(np.mean((true_values - predicted_values)**2))

    # RMSE calculations
    rmse_no_boundaries = calculate_rmse(alpha[1:], No_Boundaries[1:])
    rmse_balanced = calculate_rmse(alpha[1:], Balanced[1:])
    rmse_economical = calculate_rmse(alpha[1:], Economical[1:])

    # Print RMSE values and optimal weights

    data = {"message": f"""
    Optimal weights for No Boundaries:
    Weight_OPC = {Weight_OPC:.3f}
    Weight_SF = {optimal_weights_no_boundaries[0]:.3f}
    Weight_SS = {optimal_weights_no_boundaries[1]:.3f}
    Weight_Slag = {optimal_weights_no_boundaries[2]:.3f}
    <span>RMSE for No Boundaries: {rmse_no_boundaries:.3f}</span>

    Optimal weights for Balanced:
    Weight_OPC = {Weight_OPC:.3f}
    Weight_SF = {optimal_weights_balanced[0]:.3f}
    Weight_SS = {optimal_weights_balanced[1]:.3f}
    Weight_Slag = {optimal_weights_balanced[2]:.3f}
    <span>RMSE for Balanced: {rmse_balanced:.3f}</span>

    Optimal weights for Economical:
    Weight_OPC = {Weight_OPC:.3f}
    Weight_SF = {optimal_weights_economical[0]:.3f}
    Weight_SS = {optimal_weights_economical[1]:.3f}
    Weight_Slag = {optimal_weights_economical[2]:.3f}
    <span>RMSE for Economical: {rmse_economical:.3f}</span>
    """
    ,'rmse' : rmseString
    }
    # Exclude the first entry for each dataset
    d_plot = d[1:]  # Exclude the first element from x-axis values
    alpha_plot = alpha[1:]  # Exclude the first element from alpha values
    No_Boundaries_plot = No_Boundaries[1:]  # Exclude the first element from No Boundaries values
    Balanced_plot = Balanced[1:]  # Exclude the first element from Balanced values
    Economical_plot = Economical[1:]  # Exclude the first element from Economical values

    # Plotting the results
    plt.figure(figsize=(8, 6))
    plt.plot(d_plot, alpha_plot, label=f'Optimal (RMSE = {calculate_rmse(alpha[1:], alpha_plot):.3f})', color='red')
    plt.plot(d_plot, No_Boundaries_plot, label=f'No Boundaries (RMSE = {rmse_no_boundaries:.3f})', color='grey', linestyle='--')
    plt.plot(d_plot, Balanced_plot, label=f'Balanced (RMSE = {rmse_balanced:.3f})', color='green', linestyle='--')
    plt.plot(d_plot, Economical_plot, label=f'Economical (RMSE = {rmse_economical:.3f})', color='blue', linestyle='--')
    plt.xscale('log')  # Set x-axis to logarithmic scale
    plt.xlabel('Particle Diameter (μm)')
    plt.ylabel('Passing Percentage (%)')
    plt.title('PSD Optimization')
    plt.legend()
    plt.xlim(left=d_plot.min(), right=500)
    formatter = FuncFormatter(lambda x, _: f'{x:.0f}')
    plt.gca().xaxis.set_major_formatter(formatter)
    plt.xticks([d_plot.min(), 10, 100, 500])
    plt.grid(True, which="both", ls="--")  # Show grid for both major and minor ticks

    img = io.BytesIO()
    plt.savefig(img, format='png', dpi=300)
    img.seek(0)
    plt.close()

    return {'img' : img, 'graphData' : data['message'], 'rmseData' : data['rmse']}